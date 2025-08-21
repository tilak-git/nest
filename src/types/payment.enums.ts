export enum OrderStatus_ENUM {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionStatus_ENUM {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trailing',
  UNPAID = 'unpaid',
}

export enum PaymentMethod_ENUM {
  CARD = 'card',
  UPI = 'upi',
}

export enum Currency_ENUM {
  INR = 'inr',
  USD = 'usd',
}
