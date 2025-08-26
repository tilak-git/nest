import { Buffer } from 'buffer';

import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Param,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { CurrentUser } from '@/lib/decorators/currentUser.decoraror';
import { Public } from '@/lib/decorators/public.decorator';
import {
  CreateCheckoutSessionDto,
  CreatePaymentIntentDto,
} from '@/modules/payment/dto/payment.dto';
import { PaymentIntentService } from '@/modules/payment/payment-intent/payment-intent.service';
import { PaymentService } from '@/modules/payment/payment.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentIntentService: PaymentIntentService,
  ) {}

  @Get('plans')
  async getPaymentPlans() {
    return this.paymentService.getPaymentPlans();
  }

  @Post('checkout')
  async createCheckoutSession(@Body() createCheckoutSessionDto: CreateCheckoutSessionDto) {
    return this.paymentService.createCheckoutSession(createCheckoutSessionDto);
  }

  @Post('plan/change')
  async changePlan(@CurrentUser('id') userId: string, @Body() body: { priceId: string }) {
    return this.paymentService.handlePlanChange(userId, body.priceId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: FastifyRequest & { rawBody: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody, signature);
  }

  @Post('intent/create-intent')
  async createPaymentIntent(@Body() createPaymentIntentDto: CreatePaymentIntentDto) {
    return this.paymentIntentService.createPaymentIntent(createPaymentIntentDto);
  }

  @Get('intent/:id')
  async getPaymentIntent(@Param('id') id: string) {
    return this.paymentIntentService.getPaymentIntent(id);
  }
}
