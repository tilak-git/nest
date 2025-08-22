import { Buffer } from 'buffer';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { Currency_ENUM, PaymentMethod_ENUM } from '@/types/payment.enums';

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

  async updateSubscriptionDirect(
    subscriptionId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const subscriptionItemId = subscription.items.data[0].id;
    const currentPriceId = subscription.items.data[0].price.id;

    if (currentPriceId === priceId) {
      throw new Error('User is already subscribed to this plan');
    }

    const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: priceId,
        },
      ],
      expand: ['latest_invoice.payment_intent'],
      payment_behavior: 'default_incomplete',
    });

    logger.info(`Subscription ${subscriptionId} updated successfully to price ${priceId}`);
    return updatedSubscription;
  }

  async cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
    return subscriptions.data;
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
