import { Buffer } from 'buffer';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { CreateCheckoutSessionDto } from '@/modules/payment/dto/payment.dto';
import { PaymentIntentService } from '@/modules/payment/payment-intent/payment-intent.service';
import { PaymentSubscriptionService } from '@/modules/payment/payment-subscription/payment-subscription.service';
import { StripeService } from '@/modules/payment/stripe/stripe.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { PaymentMethod_ENUM } from '@/types/payment.enums';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private paymentIntentService: PaymentIntentService,
    private paymentSubscriptionService: PaymentSubscriptionService,
    private configService: ConfigService,
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
      case 'checkout.session.completed':
        await this.paymentSubscriptionService.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
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
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    return { url: session.url };
  }

  async handlePlanChange(userId: string, priceId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
        },
      },
    });

    if (!user || !user.stripeCustomerId) {
      throw new Error(`User not found or does not have a Stripe customer ID: ${userId}`);
    }

    const activeSubscription = user.subscriptions[0];

    if (!activeSubscription) {
      throw new Error(`User does not have an active subscription to change`);
    }

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { stripePriceId: priceId },
    });

    if (!newPlan) {
      throw new Error(`Invalid price ID: ${priceId}`);
    }

    if (activeSubscription.planId === newPlan.id) {
      throw new Error(`User is already subscribed to this plan`);
    }

    logger.info(
      `User ${user.email} attempting to change from ${activeSubscription.plan?.name} to ${newPlan.name}`,
    );

    const currentPrice = activeSubscription.plan?.price || 0;
    const newPrice = newPlan.price;

    if (newPrice <= currentPrice) {
      const updatedSubscription = await this.stripeService.updateSubscriptionDirect(
        activeSubscription.stripeSubscriptionId,
        priceId,
      );

      logger.info(`Plan changed successfully without checkout for user ${user.email}`);

      return {
        requiresPayment: false,
        message: 'Plan changed successfully',
        subscription: updatedSubscription,
      };
    } else {
      const session = await this.stripeService.createCheckoutSession({
        mode: 'subscription',
        customer: user.stripeCustomerId,
        payment_method_types: [PaymentMethod_ENUM.CARD],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${this.configService.getOrThrow<string>('FRONTEND_URL')}/dashboard?plan_change=success`,
        cancel_url: `${this.configService.getOrThrow<string>('FRONTEND_URL')}/dashboard?plan_change=cancelled`,
        subscription_data: {
          metadata: {
            replacing_subscription: activeSubscription.stripeSubscriptionId,
            plan_change: 'true',
            user_id: userId,
          },
        },
        allow_promotion_codes: true,
      });

      logger.info(`Plan change requires checkout for user ${user.email}`);

      return {
        requiresPayment: true,
        url: session.url,
        message: 'Redirecting to payment...',
      };
    }
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
      orderBy: { price: 'asc' },
    });

    return plans;
  }

  async getUserCurrentPlan(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user?.subscriptions?.length) {
      return null;
    }

    return {
      subscription: user.subscriptions[0],
      plan: user.subscriptions[0].plan,
    };
  }
}
