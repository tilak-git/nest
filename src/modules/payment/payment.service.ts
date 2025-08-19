import { Buffer } from 'buffer';

import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { CreatePaymentIntentDto } from '@/modules/payment/dto/create-payment-intent.dto';
import { StripeService } from '@/modules/payment/stripe/stripe.service';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    try {
      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      console.log('User found:', user);

      if (!user) {
        const stripeCustomer = await this.stripeService.createCustomer(dto.email, dto.name);

        user = await this.prisma.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            // password: 'temp-password', // Add temporary password for payment users
            stripeCustomerId: stripeCustomer.id,
          },
        });
      }

      // Ensure user has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const stripeCustomer = await this.stripeService.createCustomer(
          dto.email,
          dto.name || undefined,
        );

        // Update user with Stripe customer ID
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: stripeCustomer.id },
        });

        customerId = stripeCustomer.id;
      }

      // Create payment intent
      const paymentIntent = await this.stripeService.createPaymentIntent(
        dto.amount,
        'inr',
        customerId,
      );

      // Create order record
      const order = await this.prisma.order.create({
        data: {
          userId: user.id,
          stripePaymentIntentId: paymentIntent.id,
          amount: dto.amount * 100, // Store in paisa
          currency: 'inr',
          status: 'PENDING',
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
      };
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async handleWebhook(body: Buffer, signature: string) {
    try {
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
        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      logger.info('Webhook error:', error);
      throw error;
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'PAID' },
    });

    logger.info(`Payment succeeded for intent: ${paymentIntent.id}`);
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'FAILED' },
    });

    logger.info(`Payment failed for intent: ${paymentIntent.id}`);
  }

  private async handleInvoicePaymentSuccess(invoice: Stripe.Invoice) {
    // Handle subscription payment success
    logger.info(`Invoice payment succeeded: ${invoice.id}`);
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
