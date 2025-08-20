export enum OrderStatus_ENUM {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionStatus_ENUM {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
  UNPAID = 'UNPAID',
}

export enum PaymentMethod_ENUM {
  CARD = 'card',
  UPI = 'upi',
}

export enum Currency_ENUM {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}
