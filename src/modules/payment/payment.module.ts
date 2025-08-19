import { Module } from '@nestjs/common';

import { PaymentsController } from '@/modules/payment/payment.controller';
import { PaymentService } from '@/modules/payment/payment.service';
import { StripeService } from '@/modules/payment/stripe/stripe.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentService, StripeService],
})
export class PaymentModule {}
