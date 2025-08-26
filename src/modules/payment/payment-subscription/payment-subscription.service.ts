import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

import { logger } from '@/lib/logger/logger';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { SubscriptionStatus_ENUM } from '@/types/payment.enums';

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
          status: SubscriptionStatus_ENUM.CANCELLED,
          deletedAt: new Date(),
        },
      });

      logger.info(`Cancelled old subscription ${isReplacingSubscription} for user ${user.email}`);
    }

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.start_date * 1000),
        currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
        planId: plan.id,
        deletedAt: null,
      },
      create: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status as SubscriptionStatus,
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

    const isPlanChange = existingSubscription.planId !== plan.id;
    const newStatus = subscription.status as SubscriptionStatus;

    const shouldUpdate =
      newStatus === SubscriptionStatus_ENUM.ACTIVE ||
      newStatus === SubscriptionStatus_ENUM.CANCELLED ||
      newStatus === SubscriptionStatus_ENUM.INCOMPLETE_EXPIRED ||
      (!isPlanChange && newStatus !== existingSubscription.status);

    if (!shouldUpdate && isPlanChange && newStatus === SubscriptionStatus_ENUM.PAST_DUE) {
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
      isPlanChange && newStatus === SubscriptionStatus_ENUM.ACTIVE
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
        status: SubscriptionStatus_ENUM.CANCELLED,
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

    // Can send email notification here if needed
  }
}
