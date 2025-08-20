import { Buffer } from 'buffer';

import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { CreateCheckoutSessionDto } from '@/modules/payment/dto/create-checkout-session.dto';
import { CreatePaymentIntentDto } from '@/modules/payment/dto/create-payment-intent.dto';
import { StripeService } from '@/modules/payment/stripe/stripe.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Currency_ENUM, OrderStatus_ENUM } from '@/types/payment.enums';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      const stripeCustomer = await this.stripeService.createCustomer(dto.email, dto.name);

      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          stripeCustomerId: stripeCustomer.id,
        },
      });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const stripeCustomer = await this.stripeService.createCustomer(
        dto.email,
        dto.name || undefined,
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });

      customerId = stripeCustomer.id;
    }

    const paymentIntent = await this.stripeService.createPaymentIntent(
      dto.amount,
      Currency_ENUM.INR,
      customerId,
    );

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: dto.amount * 100, // Store in paisa
        currency: Currency_ENUM.INR,
        status: OrderStatus_ENUM.PENDING,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    };
  }

  async handleWebhook(body: Buffer, signature: string) {
    const event = await this.stripeService.constructWebhookEvent(body, signature);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSuccess(event.data.object as Stripe.Invoice);
        break;
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: OrderStatus_ENUM.PAID },
    });

    logger.info(`Payment succeeded for intent: ${paymentIntent.id}`);
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: OrderStatus_ENUM.FAILED },
    });

    logger.info(`Payment failed for intent: ${paymentIntent.id}`);
  }

  private async handleInvoicePaymentSuccess(invoice: Stripe.Invoice) {
    logger.info(`Invoice payment succeeded: ${invoice.id}`);
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: session.customer as string },
    });

    logger.info(`Checkout Session with user: ${session.id} , ${user?.email}`);

    if (!user) {
      throw new Error(`User not found for customer ID: ${session.customer}`);
    }

    if (session.subscription) {
      await this.prisma.order.create({
        data: {
          userId: user.id,
          stripePaymentIntentId: session.payment_intent as string,
          amount: 0,
          currency: Currency_ENUM.INR,
          status: OrderStatus_ENUM.PAID,
        },
      });
    }

    logger.info(`Checkout Session payment succeeded: ${session.id}`);
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

  async getPaymentIntent(id: string) {
    const paymentIntent = await this.stripeService.retrievePaymentIntent(id);
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: id },
      include: { user: true },
    });

    return {
      paymentIntent,
      order,
    };
  }
}
