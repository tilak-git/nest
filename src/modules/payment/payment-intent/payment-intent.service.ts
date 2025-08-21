import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { CreatePaymentIntentDto } from '@/modules/payment/dto/payment.dto';
import { StripeService } from '@/modules/payment/stripe/stripe.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Currency_ENUM, OrderStatus_ENUM } from '@/types/payment.enums';

@Injectable()
export class PaymentIntentService {
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

  async handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (existingOrder) {
      logger.info(`Order already exists for intent: ${paymentIntent.id}`);
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: paymentIntent.customer as string },
    });

    if (!user) {
      throw new Error(`User not found for customer ID: ${paymentIntent.customer}`);
    }

    await this.prisma.order.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: paymentIntent.id as string,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: OrderStatus_ENUM.PENDING,
      },
    });

    logger.info(`Payment Intent Created for : ${paymentIntent.id}`);
  }

  async handlePaymentIntentSuccess(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: OrderStatus_ENUM.PAID },
    });

    logger.info(`Payment succeeded for intent: ${paymentIntent.id}`);
  }

  async handlePaymentIntentFailure(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: OrderStatus_ENUM.FAILED },
    });

    logger.info(`Payment failed for intent: ${paymentIntent.id}`);
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
