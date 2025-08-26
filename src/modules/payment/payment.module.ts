import { Module } from '@nestjs/common';

import { PaymentIntentService } from '@/modules/payment/payment-intent/payment-intent.service';
import { PaymentSubscriptionService } from '@/modules/payment/payment-subscription/payment-subscription.service';
import { PaymentsController } from '@/modules/payment/payment.controller';
import { PaymentService } from '@/modules/payment/payment.service';
import { StripeService } from '@/modules/payment/stripe/stripe.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentService, StripeService, PaymentIntentService, PaymentSubscriptionService],
})
export class PaymentModule {}
