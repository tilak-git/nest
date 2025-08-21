import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class PaymentSubscriptionService {
  constructor(private prisma: PrismaService) {}

  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
    });

    const stripePriceId = subscription.items.data[0].price.id;

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { stripePriceId },
    });

    if (!plan) {
      throw new Error(`No plan found for Stripe price ID: ${stripePriceId}`);
    }

    if (!user) {
      throw new Error(`User not found for customer ID: ${subscription.customer}`);
    }

    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.start_date * 1000),
        planId: plan.id,
        currentPeriodEnd: subscription?.ended_at ? new Date(subscription.ended_at * 1000) : null,
      },
    });

    logger.info(`Created subscription ${subscription.id} for user ${user.email}`);
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const priceId = subscription.items.data[0].price.id;

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { stripePriceId: priceId },
    });

    if (!plan) {
      throw new Error(`No plan found for price ID: ${priceId}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!user) {
      throw new Error(`User not found for customer ID: ${subscription.customer}`);
    }

    await this.prisma.subscription.update({
      where: { userId: user.id },
      data: {
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.start_date * 1000),
        currentPeriodEnd: subscription?.ended_at ? new Date(subscription.ended_at * 1000) : null,
        planId: plan?.id,
      },
    });

    logger.info(`Subscription updated for customer ${subscription.customer}, plan: ${plan?.name}`);
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.start_date * 1000),
        currentPeriodEnd: subscription?.ended_at ? new Date(subscription.ended_at * 1000) : null,
      },
    });

    logger.info(`Ended subscription ${subscription.id} for customer: ${subscription.customer}`);
  }
}
