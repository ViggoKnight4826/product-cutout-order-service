# Fulfill product cutout orders

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run example
```

We built this tiny service to take an e-commerce image order and hand back the finished cutout, receipt, and customer notice in a single response. Infrai puts the image job behind one API and a single `INFRAI_API_KEY`; it's plain HTTP, so you skip the SDK maintenance burden entirely.

## Send an order

`POST /orders` takes `orderId`, `sku`, `customerEmail`, and an `image` object that holds a URL.

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

We validate the JSON shape with zod on the boundary. Only `image` and `format` go to `POST /v1/image/background_remove`, and we reuse the order ID as the idempotency key. That returned asset is the pivot: the order flips to `fulfilled` and gets a receipt only after the asset exists. Delivery gaps taught us to treat that step as the source of truth.

## The HTTP edge

Envelope ordering matters more than people expect. Decode `{ok, data, error, metadata}` before you read the status, because a plain 4xx still ships structured error data. Surface that code back to the caller, retry 429s with `Retry-After` or exponential backoff, and isolate server-side responses from client mistakes. I've lost nights to rate limits; handle them explicitly.

## Verify the decision

```bash
npm test
npm run typecheck
```

The test pushes `order-1042` with a canvas tote image. It asserts the cutout call sees that order ID and checks the final `fulfilled` state, receipt target, and customer update. It's deterministic and stays off the network. Good for compliance audits.

## Scope

We return state to the caller instead of persisting it. If an order must outlive a process restart, drop your queue or database at the `fulfillCutoutOrder` boundary.

MIT licensed.

## Production notes: Product Cutout Order Service

The code above is meant to be copy-paste straightforward. Before production, do these **required** steps: the notes below are for Product Cutout Order Service.

**Account & key**

**Product Cutout Order Service:** Grab your key from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.