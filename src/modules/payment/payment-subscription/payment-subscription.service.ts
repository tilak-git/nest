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
      include: {
        subscriptions: true,
      },
    });

    if (!user) {
      throw new Error(`User not found for customer ID: ${subscription.customer}`);
    }

    const stripePriceId = subscription.items.data[0].price.id;
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { stripePriceId },
    });

    if (!plan) {
      throw new Error(`No plan found for Stripe price ID: ${stripePriceId}`);
    }

    const existingSubscription = user.subscriptions.find(
      (sub) => sub.stripeSubscriptionId === subscription.id,
    );

    if (existingSubscription) {
      logger.info(`Subscription ${subscription.id} already exists, skipping creation`);
      return;
    }

    // If this is a plan change (replacing an old subscription), handle it
    const isReplacingSubscription = subscription.metadata?.replacing_subscription;

    if (isReplacingSubscription) {
      await this.prisma.subscription.updateMany({
        where: {
          userId: user.id,
          stripeSubscriptionId: isReplacingSubscription,
        },
        data: {
          status: 'CANCELLED',
          deletedAt: new Date(),
        },
      });

      logger.info(`Cancelled old subscription ${isReplacingSubscription} for user ${user.email}`);
    }

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.start_date * 1000),
        currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
        planId: plan.id,
        deletedAt: null,
      },
      create: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.start_date * 1000),
        currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
        planId: plan.id,
      },
    });

    logger.info(
      `Created subscription ${subscription.id} for user ${user.email} with plan ${plan.name}`,
    );
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
      include: {
        subscriptions: {
          where: {
            stripeSubscriptionId: subscription.id,
          },
          include: {
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error(`User not found for customer ID: ${subscription.customer}`);
    }

    const existingSubscription = user.subscriptions[0];
    if (!existingSubscription) {
      logger.info(`Subscription ${subscription.id} not found in database, creating new one`);
      await this.handleSubscriptionCreated(subscription);
      return;
    }

    const stripePriceId = subscription.items.data[0].price.id;
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { stripePriceId },
    });

    if (!plan) {
      throw new Error(`No plan found for price ID: ${stripePriceId}`);
    }

    // Check if this is a plan change
    const isPlanChange = existingSubscription.planId !== plan.id;
    const newStatus = subscription.status.toUpperCase() as SubscriptionStatus;

    // Only update the subscription if:
    // 1. Status changed to something meaningful (not PAST_DUE from plan change attempt)
    // 2. It's a successful plan change (status is ACTIVE)
    // 3. It's a legitimate status update
    const shouldUpdate =
      newStatus === 'ACTIVE' ||
      newStatus === 'CANCELLED' ||
      newStatus === 'INCOMPLETE_EXPIRED' ||
      (!isPlanChange && newStatus !== existingSubscription.status);

    if (!shouldUpdate && isPlanChange && newStatus === 'PAST_DUE') {
      logger.info(
        `Skipping subscription update - plan change attempt with PAST_DUE status for user ${user.email}`,
      );
      return;
    }

    await this.prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: newStatus,
        currentPeriodStart: new Date(subscription.start_date * 1000),
        currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
        planId: plan.id,
      },
    });

    const statusMessage =
      isPlanChange && newStatus === 'ACTIVE'
        ? `Plan changed from ${existingSubscription.plan?.name} to ${plan.name}`
        : `Status updated to ${newStatus}`;

    logger.info(`Subscription updated for user ${user.email}: ${statusMessage}`);
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: subscription.customer as string },
    });

    if (!user) {
      logger.error(`User not found for customer ID: ${subscription.customer}`);
      return;
    }

    await this.prisma.subscription.updateMany({
      where: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
      },
      data: {
        status: 'CANCELLED',
        currentPeriodEnd: subscription.ended_at
          ? new Date(subscription.ended_at * 1000)
          : new Date(),
        deletedAt: new Date(),
      },
    });

    logger.info(`Cancelled subscription ${subscription.id} for user ${user.email}`);
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription' || !session.subscription) return;

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: session.customer as string },
    });

    if (!user) {
      logger.error(`User not found for customer ID: ${session.customer}`);
      return;
    }

    logger.info(
      `Checkout session completed for user ${user.email}, subscription: ${session.subscription}`,
    );

    // If this was a plan change, the subscription.created/updated webhook will handle the database updates
    // This event is mainly for logging and any session-specific logic
  }
}
