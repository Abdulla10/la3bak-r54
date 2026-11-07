export type PaymentMode = 'disabled' | 'test' | 'live';

/** Sanitized data only: never include provider payloads, customer data or card fragments. */
export interface ProviderTransaction {
  id: string;
  object: 'charge' | 'refund';
  status: string;
  amountMinor: number;
  currency: string;
  liveMode: boolean;
  /** Refunds may return '' when Tap omits the documented order reference/metadata. */
  orderId: string;
  chargeId?: string;
  merchantId?: string;
  checkoutUrl?: string;
  /** Provider timestamp as returned, in milliseconds for Tap V2; not Date.now(). */
  created: number;
}

/** All IDs, amounts and callback URLs must come from immutable, approved server records. */
export interface ChargeRequest {
  orderId: string;
  amountMinor: number;
  currency: 'AED';
  name: string;
  email: string;
  returnUrl: string;
  webhookUrl: string;
  idempotencyKey: string;
}

export interface RefundRequest {
  orderId: string;
  chargeId: string;
  amountMinor: number;
  currency: 'AED';
  reason: string;
  idempotencyKey: string;
  webhookUrl: string;
}

/** A verified webhook is a notification, NOT permission to credit a wallet. */
export interface PaymentProvider {
  readonly name: string;
  readonly mode: 'test' | 'live';
  createCharge(req: ChargeRequest): Promise<ProviderTransaction>;
  retrieveCharge(id: string): Promise<ProviderTransaction>;
  createRefund(req: RefundRequest): Promise<ProviderTransaction>;
  retrieveRefund(id: string): Promise<ProviderTransaction>;
  verifyWebhook(raw: Buffer, signature: string): ProviderTransaction;
  validateCheckoutUrl(url: string): boolean;
}
