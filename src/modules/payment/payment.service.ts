import { Buffer } from 'buffer';

import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { CreateCheckoutSessionDto } from '@/modules/payment/dto/payment.dto';
import { PaymentIntentService } from '@/modules/payment/payment-intent/payment-intent.service';
import { PaymentSubscriptionService } from '@/modules/payment/payment-subscription/payment-subscription.service';
import { StripeService } from '@/modules/payment/stripe/stripe.service';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private paymentIntentService: PaymentIntentService,
    private paymentSubscriptionService: PaymentSubscriptionService,
  ) {}

  async handleWebhook(body: Buffer, signature: string) {
    const event = await this.stripeService.constructWebhookEvent(body, signature);
    logger.info(`Event from Stripe in Payment Webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.created':
        await this.paymentIntentService.handlePaymentIntentCreated(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'payment_intent.succeeded':
        await this.paymentIntentService.handlePaymentIntentSuccess(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.paymentIntentService.handlePaymentIntentFailure(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'customer.subscription.created':
        await this.paymentSubscriptionService.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.updated':
        await this.paymentSubscriptionService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.paymentSubscriptionService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  async createCheckoutSession(createCheckoutSessionDto: CreateCheckoutSessionDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: createCheckoutSessionDto.email },
    });

    if (!user) {
      const stripeCustomer = await this.stripeService.createCustomer(
        createCheckoutSessionDto.email,
      );
      user = await this.prisma.user.create({
        data: {
          email: createCheckoutSessionDto.email,
          stripeCustomerId: stripeCustomer.id,
        },
      });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const stripeCustomer = await this.stripeService.createCustomer(
        user.email,
        user.name || undefined,
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });

      customerId = stripeCustomer.id;
    }

    const session = await this.stripeService.createCheckoutSession({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: createCheckoutSessionDto.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    return { url: session.url };
  }

  async handlePlanChange(userId: string, priceId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      throw new Error(`User not found or does not have a Stripe customer ID: ${userId}`);
    }

    const subscription = await this.stripeService.updateSubscription(
      user.stripeCustomerId,
      priceId,
    );

    return subscription;
  }

  async getPaymentPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stripePriceId: true,
      },
    });

    return plans;
  }
}
