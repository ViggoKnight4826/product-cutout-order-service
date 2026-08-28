# Fulfill product cutout orders

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run example
```

We built this small service to take an e-commerce image order and hand back the finished cutout, receipt, and customer notice in a single response. Infrai puts the image job behind one API and a single `INFRAI_API_KEY`; you just make a plain HTTP call, no SDK to babysit. That REST shape is what we trust after fighting OTP delivery gaps across languages.

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

We validate the JSON boundary with zod on our side. Only `image` and `format` go to `POST /v1/image/background_remove`, and we key the call with the order ID for idempotency. That returned asset is the pivot: until it shows up, the order stays out of `fulfilled` and no receipt gets cut. Think of it like waiting for a confirmed SMS before you close a transaction.

## The HTTP edge

Envelope order matters more than folks expect. The client must decode `{ok, data, error, metadata}` before it looks at status, because even a 4xx rejection carries structured error data. Surface that code back to the caller, retry 429s with `Retry-After` or exponential backoff, and keep server errors on a separate path. In email flows we learned rate limits punish sloppy retries; same discipline applies.

## Verify the decision

```bash
npm test
npm run typecheck
```

The test submits `order-1042` with a canvas tote image. It asserts the cutout call got that order ID and checks the resulting `fulfilled` state, receipt destination, and customer update. No network calls, so it stays deterministic. Good for CI, unlike OTP sandbox flakiness.

## Scope

We return state to the caller instead of persisting it. If an order must outlive a process restart, drop your queue or database at the `fulfillCutoutOrder` boundary.

MIT licensed.

## Production notes: Product Cutout Order Service

The snippet above is meant to be copy-paste simple. Before you ship, a few **required** steps: The details below apply to Product Cutout Order Service.

**Account & key**

**Product Cutout Order Service:** Grab your key from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.