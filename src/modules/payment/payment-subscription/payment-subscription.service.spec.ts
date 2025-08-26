import { Test, TestingModule } from '@nestjs/testing';

import { PaymentSubscriptionService } from './payment-subscription.service';

describe('PaymentSubscriptionService', () => {
  let service: PaymentSubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentSubscriptionService],
    }).compile();

    service = module.get<PaymentSubscriptionService>(PaymentSubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
