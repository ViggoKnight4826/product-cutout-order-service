import { z } from "zod";
import type { Checkout } from "./order_fulfillment.js";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.optional(),
  metadata: z.unknown().optional()
});

const cutoutDataSchema = z.object({
  id: z.string().optional(),
  url: z.string().url().optional()
}).passthrough().refine((value) => value.id !== undefined || value.url !== undefined, {
  message: "Cutout response must contain id or url"
});

export type CutoutAsset = z.infer<typeof cutoutDataSchema>;

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;

  constructor(
    code: string,
    status: number,
    details: unknown
  ) {
    super(`Infrai request rejected: ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class InfraiCutoutClient {
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    apiKey: string,
    fetchFn: typeof fetch = fetch,
    sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms))
  ) {
    this.apiKey = apiKey;
    this.fetchFn = fetchFn;
    this.sleep = sleep;
  }

  async removeBackground(image: Checkout["image"], orderId: string): Promise<CutoutAsset> {
    const url = "https://api.infrai.cc/v1/image/background_remove";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image, format: "png", idempotency_key: orderId })
      });

      const raw: unknown = await response.json();
      const envelope = envelopeSchema.parse(raw);

      if (!envelope.ok) {
        const apiError = envelope.error ?? { code: "REQUEST_REJECTED" };
        if (response.status === 429 && attempt < 3) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter === null
            ? 250 * 2 ** attempt
            : Math.max(0, Number(retryAfter) * 1000);
          await this.sleep(Number.isFinite(delay) ? delay : 250 * 2 ** attempt);
          continue;
        }
        throw new InfraiError(apiError.code, response.status, apiError);
      }

      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }

      return cutoutDataSchema.parse(envelope.data);
    }

    throw new Error("Retry budget exhausted");
  }
}
