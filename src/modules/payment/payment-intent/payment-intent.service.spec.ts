import { Test, TestingModule } from '@nestjs/testing';

import { PaymentIntentService } from './payment-intent.service';

describe('PaymentIntentService', () => {
  let service: PaymentIntentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentIntentService],
    }).compile();

    service = module.get<PaymentIntentService>(PaymentIntentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
