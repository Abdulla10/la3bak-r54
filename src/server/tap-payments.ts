import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type {
  ChargeRequest, PaymentProvider, ProviderTransaction, RefundRequest,
} from './payment-provider.js';

const API_BASE = 'https://api.tap.company/v2';
// Exact hostname documented by Create a Charge's src_all response; no wildcard subdomains.
const CHECKOUT_HOSTS = new Set(['checkout.payments.tap.company']);
const TIMEOUT_MS = 10_000;
const MAX_PAYLOAD_BYTES = 128 * 1024;
const MAX_SAFE_MINOR = BigInt(Number.MAX_SAFE_INTEGER);
type RecordValue = Record<string, unknown>;

function invalid(): never { throw new Error('Invalid Tap payload'); }
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as RecordValue;
}
function optionalRecord(value: unknown): RecordValue {
  return value === undefined ? {} : record(value);
}
function text(value: unknown, max = 200, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.length)
      || /[\u0000-\u001f\u007f]/.test(value)) invalid();
  return value;
}
function serverId(value: unknown): string {
  const id = text(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id)) invalid();
  return id;
}
function providerId(value: unknown, object: 'charge' | 'refund'): string {
  const id = text(value);
  if (!(object === 'charge' ? /^chg_[A-Za-z0-9_]+$/ : /^re_[A-Za-z0-9_]+$/).test(id)) invalid();
  return id;
}

/** Parse decimal AED without multiplying a binary floating point value or rounding. */
function decimalToMinor(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') invalid();
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) invalid();
  const decimal = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(decimal) || decimal.length > 32) invalid();
  const [whole, fraction = ''] = decimal.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor > MAX_SAFE_MINOR) invalid();
  return Number(minor);
}
function minorAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0
      || Object.is(value, -0)) invalid();
  return value;
}
function fixedAmount(minor: number): string {
  const amount = BigInt(minor);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}
function timestamp(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') invalid();
  const digits = String(value);
  if (!/^(?:0|[1-9]\d*)$/.test(digits) || digits.length > 16) invalid();
  const created = BigInt(digits);
  if (created > MAX_SAFE_MINOR) invalid();
  return Number(created);
}

/** Keep JSON numeric lexemes exact before decimal validation (including near 2^53). */
function parsePayload(raw: Buffer): RecordValue {
  if (!Buffer.isBuffer(raw) || !raw.length || raw.length > MAX_PAYLOAD_BYTES) invalid();
  const json = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  // First pass validates the original JSON grammar, before replacing numeric tokens.
  JSON.parse(json);
  let previousString: string | undefined;
  let previousEnd = 0;
  const exactNumbers = json.replace(
    /"(?:\\[\s\S]|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (token: string, offset: number) => {
      const decimalField = (previousString === 'amount' || previousString === 'created')
        && json.slice(previousEnd, offset).trim() === ':';
      previousString = token.startsWith('"') ? JSON.parse(token) as string : undefined;
      previousEnd = offset + token.length;
      // Only money/timestamps need lexeme preservation; a numeric merchant ID stays invalid.
      return !token.startsWith('"') && decimalField ? JSON.stringify(token) : token;
    },
  );
  return record(JSON.parse(exactNumbers));
}

/** Upstream must additionally approve exact origins; this adapter never takes a client URL. */
function callbackUrl(value: unknown): string {
  const urlString = text(value, 2048);
  if (!urlString.startsWith('https://') || /[\s\\]/.test(urlString)) invalid();
  const url = new URL(urlString);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.hash
      || (url.port && url.port !== '443') || !host.includes('.')
      || host.endsWith('.') || host === 'localhost' || host.endsWith('.localhost')
      || host.endsWith('.local') || isIP(host.replace(/^\[|\]$/g, ''))) invalid();
  return urlString;
}

export interface TapPaymentProviderOptions {
  secretKey: string;
  mode: 'test' | 'live';
  merchantId: string;
  fetcher?: typeof fetch;
}

/** Reference implementation, not a merchant-provider selection or payment-core integration. */
export class TapPaymentProvider implements PaymentProvider {
  readonly #secretKey: string;
  readonly #merchantId: string;
  readonly #fetcher: typeof fetch;
  readonly #mode: 'test' | 'live';

  get name(): string { return 'tap'; }
  get mode(): 'test' | 'live' { return this.#mode; }

  constructor(options: TapPaymentProviderOptions) {
    try {
      if (!options || (options.mode !== 'test' && options.mode !== 'live')) invalid();
      if (typeof options.secretKey !== 'string' || options.secretKey.length > 256
          || !new RegExp(`^sk_${options.mode}_[A-Za-z0-9_-]+$`).test(options.secretKey)) invalid();
      this.#secretKey = options.secretKey;
      this.#merchantId = serverId(options.merchantId);
      this.#mode = options.mode;
      this.#fetcher = options.fetcher ?? globalThis.fetch;
      if (typeof this.#fetcher !== 'function') invalid();
    } catch {
      throw new Error('Invalid Tap configuration');
    }
  }

  validateCheckoutUrl(value: string): boolean {
    try {
      if (typeof value !== 'string' || value.length > 2048
          || !value.startsWith('https://') || /[\s\\]/.test(value)) return false;
      const url = new URL(value);
      return url.protocol === 'https:' && CHECKOUT_HOSTS.has(url.hostname)
        && !url.username && !url.password && !url.hash && (!url.port || url.port === '443');
    } catch { return false; }
  }

  async createCharge(req: ChargeRequest): Promise<ProviderTransaction> {
    try {
      const orderId = serverId(req.orderId);
      const idempotencyKey = serverId(req.idempotencyKey);
      const amountMinor = minorAmount(req.amountMinor);
      if (req.currency !== 'AED') invalid();
      const name = text(req.name, 200);
      const email = text(req.email, 254);
      if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid();
      const body = this.#body(amountMinor, {
        currency: 'AED', customer_initiated: true, threeDSecure: true, save_card: false,
        customer: { first_name: name, email }, merchant: { id: this.#merchantId },
        source: { id: 'src_all' },
        reference: { order: orderId, transaction: idempotencyKey, idempotent: idempotencyKey },
        redirect: { url: callbackUrl(req.returnUrl) }, post: { url: callbackUrl(req.webhookUrl) },
      });
      const payload = await this.#request('/charges', 'POST', body);
      const result = this.#normalize(payload, 'charge');
      if (result.orderId !== orderId || result.amountMinor !== amountMinor) invalid();
      const reference = record(payload.reference);
      if (reference.transaction !== idempotencyKey) invalid();
      if (reference.idempotent !== undefined && reference.idempotent !== idempotencyKey) invalid();
      if (result.status === 'INITIATED' && !result.checkoutUrl) invalid();
      return result;
    } catch { throw new Error('Tap charge request failed'); }
  }

  async retrieveCharge(id: string): Promise<ProviderTransaction> {
    try {
      providerId(id, 'charge');
      const result = this.#normalize(await this.#request(`/charges/${encodeURIComponent(id)}`, 'GET'), 'charge');
      if (result.id !== id) invalid();
      return result;
    } catch { throw new Error('Tap charge retrieval failed'); }
  }

  async createRefund(req: RefundRequest): Promise<ProviderTransaction> {
    try {
      const orderId = serverId(req.orderId);
      const chargeId = providerId(req.chargeId, 'charge');
      const idempotencyKey = serverId(req.idempotencyKey);
      const amountMinor = minorAmount(req.amountMinor);
      if (req.currency !== 'AED') invalid();
      const reason = text(req.reason, 500);
      if (!reason.trim()) invalid();
      const body = this.#body(amountMinor, {
        charge_id: chargeId, currency: 'AED', reason,
        // Refund API documents merchant/idempotent, NOT charge's order/transaction fields.
        reference: { merchant: orderId, idempotent: idempotencyKey },
        metadata: { udf1: orderId }, post: { url: callbackUrl(req.webhookUrl) },
      });
      const payload = await this.#request('/refunds', 'POST', body);
      const result = this.#normalize(payload, 'refund');
      if (result.chargeId !== chargeId || result.amountMinor !== amountMinor
          || (result.orderId !== '' && result.orderId !== orderId)) invalid();
      const reference = optionalRecord(payload.reference);
      if (reference.idempotent !== undefined && reference.idempotent !== idempotencyKey) invalid();
      return result;
    } catch { throw new Error('Tap refund request failed'); }
  }

  async retrieveRefund(id: string): Promise<ProviderTransaction> {
    try {
      providerId(id, 'refund');
      const result = this.#normalize(await this.#request(`/refunds/${encodeURIComponent(id)}`, 'GET'), 'refund');
      if (result.id !== id) invalid();
      return result;
    } catch { throw new Error('Tap refund retrieval failed'); }
  }

  verifyWebhook(raw: Buffer, signature: string): ProviderTransaction {
    try {
      if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) invalid();
      const payload = parsePayload(raw);
      if (payload.object !== 'charge' && payload.object !== 'refund') invalid();
      const result = this.#normalize(payload, payload.object);
      const reference = record(payload.reference);
      // Require these fields explicitly; only gateway may be the documented empty string.
      const gatewayReference = text(reference.gateway, 512, true);
      const paymentReference = text(reference.payment, 512);
      const canonical = `x_id${result.id}x_amount${fixedAmount(result.amountMinor)}`
        + `x_currency${result.currency}x_gateway_reference${gatewayReference}`
        + `x_payment_reference${paymentReference}x_status${result.status}x_created${result.created}`;
      const expected = createHmac('sha256', this.#secretKey).update(canonical, 'utf8').digest();
      const received = Buffer.from(signature, 'hex');
      if (received.length !== expected.length || !timingSafeEqual(received, expected)) invalid();
      // The signed subset does NOT include order/merchant/mode/charge_id. Core MUST GET again.
      return result;
    } catch { throw new Error('Invalid Tap webhook'); }
  }

  #normalize(payload: RecordValue, object: 'charge' | 'refund'): ProviderTransaction {
    if (payload.object !== object || typeof payload.live_mode !== 'boolean'
        || payload.live_mode !== (this.#mode === 'live') || payload.currency !== 'AED') invalid();
    const merchantId = serverId(record(payload.merchant).id);
    if (merchantId !== this.#merchantId) invalid();
    const id = providerId(payload.id, object);
    const status = text(payload.status, 64);
    if (!/^[A-Z][A-Z_ ]*$/.test(status)) invalid();
    const amountMinor = decimalToMinor(payload.amount);
    const reference = optionalRecord(payload.reference);
    let orderId: string;
    let chargeId: string | undefined;
    let checkoutUrl: string | undefined;
    let created: number;
    if (object === 'charge') {
      orderId = serverId(reference.order);
      const transaction = record(payload.transaction);
      created = timestamp(transaction.created);
      if (transaction.url !== undefined) {
        checkoutUrl = text(transaction.url, 2048);
        if (!this.validateCheckoutUrl(checkoutUrl)) invalid();
      }
    } else {
      chargeId = providerId(payload.charge_id, 'charge');
      created = timestamp(payload.created);
      const metadata = optionalRecord(payload.metadata);
      const merchantReference = reference.merchant === undefined ? undefined : serverId(reference.merchant);
      const metadataOrder = metadata.udf1 === undefined ? undefined : serverId(metadata.udf1);
      if (merchantReference !== undefined && metadataOrder !== undefined
          && merchantReference !== metadataOrder) invalid();
      // Do NOT derive this from reference.id, charge_id or the un-documented reference.order.
      orderId = merchantReference ?? metadataOrder ?? '';
    }
    return {
      id, object, status, amountMinor, currency: 'AED', liveMode: payload.live_mode,
      orderId, merchantId, created,
      ...(chargeId !== undefined ? { chargeId } : {}),
      ...(checkoutUrl !== undefined ? { checkoutUrl } : {}),
    };
  }

  #body(amountMinor: number, fields: RecordValue): string {
    // Inject a validated numeric decimal lexeme, not a rounded JS number or a JSON string.
    return `{"amount":${fixedAmount(amountMinor)},${JSON.stringify(fields).slice(1)}`;
  }

  async #request(path: string, method: 'GET' | 'POST', body?: string): Promise<RecordValue> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = `${API_BASE}${path}`;
    const operation = async (): Promise<RecordValue> => {
      const response = await this.#fetcher(url, {
        method, redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${this.#secretKey}`, Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body } : {}),
      });
      if (!response.ok || response.status < 200 || response.status >= 300 || response.redirected
          || (response.url && response.url !== url) || !response.body) invalid();
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_PAYLOAD_BYTES) {
            // Avoid awaiting cancellation of an untrusted, unresponsive stream.
            void reader.cancel().catch(() => undefined);
            invalid();
          }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      return parsePayload(Buffer.concat(chunks));
    };
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('Tap request timeout'));
          }, TIMEOUT_MS);
        }),
      ]);
    } catch { throw new Error('Tap payment request failed'); }
    finally { if (timer !== undefined) clearTimeout(timer); }
  }
}
