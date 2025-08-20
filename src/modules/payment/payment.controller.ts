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

import { Public } from '@/lib/decorators/public.decorator';
import { CreateCheckoutSessionDto } from '@/modules/payment/dto/create-checkout-session.dto';
import { CreatePaymentIntentDto } from '@/modules/payment/dto/create-payment-intent.dto';
import { PaymentService } from '@/modules/payment/payment.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  async createPaymentIntent(@Body() createPaymentIntentDto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(createPaymentIntentDto);
  }

  @Post('checkout')
  async createCheckoutSession(@Body() createCheckoutSessionDto: CreateCheckoutSessionDto) {
    return this.paymentService.createCheckoutSession(createCheckoutSessionDto);
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

  @Get('intent/:id')
  async getPaymentIntent(@Param('id') id: string) {
    return this.paymentService.getPaymentIntent(id);
  }

  @Get('plans')
  async getPaymentPlans() {
    return this.paymentService.getPaymentPlans();
  }
}
