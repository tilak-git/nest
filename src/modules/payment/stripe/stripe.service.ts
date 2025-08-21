import { Buffer } from 'buffer';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { Currency_ENUM, PaymentMethod_ENUM, SubscriptionStatus_ENUM } from '@/types/payment.enums';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const stripeSecretKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });

    logger.info('StripeService initialized Successfully');
  }

  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string = Currency_ENUM.INR,
    customerId?: string,
  ): Promise<Stripe.PaymentIntent> {
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: amount * 100, // Convert to paisa
      currency,
      payment_method_types: [PaymentMethod_ENUM.CARD],
    };

    if (customerId) {
      paymentIntentData.customer = customerId;
    }

    return this.stripe.paymentIntents.create(paymentIntentData);
  }

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async updateSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription | Stripe.Checkout.Session> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: SubscriptionStatus_ENUM.ACTIVE,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) throw new Error('No active subscription found');

    const subscriptionItemId = subscription.items.data[0].id;

    const updatedPlan = await this.stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItemId,
          price: priceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    const latestInvoice = await this.stripe.invoices.retrieve(updatedPlan.latest_invoice as string);

    if (latestInvoice.status === 'open') {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        payment_method_types: [PaymentMethod_ENUM.CARD],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/dashboard`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
      });

      return session;
    }

    return updatedPlan;
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id);
  }

  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.stripe.checkout.sessions.create(params);
  }

  async constructWebhookEvent(body: Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }
}
