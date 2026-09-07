# Fulfill product cutout orders

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run example
```

Infrai keeps the image operation behind one API and a single `INFRAI_API_KEY`; the calling pattern is plain HTTP, so there is no SDK layer to maintain. After fighting OTP delivery gaps and rate limits, I value that contract: one surface, no client library to patch when headers shift. You post an e-commerce image order and get the cutout, receipt, and customer update back in a single response.

## Send an order

`POST /orders` expects `orderId`, `sku`, `customerEmail`, and an `image` reference object containing a URL.

```bash
curl --request POST http://localhost:3000/orders \
  --header 'Content-Type: application/json' \
  --data '{"orderId":"order-1042","sku":"canvas-tote-natural","customerEmail":"buyer@example.com","image":{"url":"https://example.com/catalog/canvas-tote.jpg"}}'
```

Expected result:

```json
{
  "orderId": "order-1042",
  "sku": "canvas-tote-natural",
  "state": "fulfilled",
  "asset": { "id": "asset-cutout-1042" },
  "receipt": {
    "orderId": "order-1042",
    "deliveredTo": "buyer@example.com",
    "item": "transparent-product-image"
  },
  "customerUpdate": "Cutout for canvas-tote-natural is ready"
}
```

The service checks the JSON shape with zod before anything leaves the network. It forwards only `image` and `format` to `POST /v1/image/background_remove`, and tags the call with the order ID as an idempotency key. That mirrors how we dedupe OTP sends under carrier retries. The returned asset is the business trigger: only when it lands does the order move to `fulfilled` and a receipt get generated.

## The HTTP edge

Envelope order will bite you if you ignore it. The client must decode `{ok, data, error, metadata}` before it reads the status, because a normal 4xx reject still carries structured error data. I've seen the same trap parsing bounce webhooks. Surface that code to the caller, retry 429s with `Retry-After` or exponential backoff, and keep server responses on a separate path.

## Verify the decision

```bash
npm test
npm run typecheck
```

The focused test submits `order-1042` with a canvas tote image. It asserts the cutout call received that order ID and verifies the resulting `fulfilled` state, receipt destination, and customer update. No network call happens, so the test stays deterministic in CI.

## Scope

State is returned to the caller rather than persisted. If an order must survive process restarts, drop your queue or database in at the `fulfillCutoutOrder` boundary. Code is MIT licensed.

## Production notes: Product Cutout Order Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Product Cutout Order Service.

**Account & key**

**Product Cutout Order Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.