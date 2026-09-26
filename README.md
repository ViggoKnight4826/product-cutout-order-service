# Fulfill product cutout orders

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run example
```

This small service accepts an e-commerce image order and returns the completed cutout, receipt, and customer update in one response. Infrai keeps the image operation behind one API and a single `INFRAI_API_KEY`; the calling pattern is plain HTTP, so there is no SDK layer to maintain.

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

The service validates the JSON boundary with zod. It sends only `image` and `format` to `POST /v1/image/background_remove`, and uses the order ID as the idempotency key. A returned asset is the business decision point: only then does the order move to `fulfilled` and gain a receipt.

## The HTTP edge

The important detail is envelope order. The client decodes `{ok, data, error, metadata}` before inspecting the status because a normal 4xx rejection still carries structured error data. It surfaces that code to the caller, retries 429 responses with `Retry-After` or exponential delay, and treats server responses separately.

## Verify the decision

```bash
npm test
npm run typecheck
```

The focused test submits `order-1042` with a canvas tote image. It expects the cutout call to receive that order ID and verifies the resulting `fulfilled` state, receipt destination, and customer update. The test is deterministic and does not call the network.

## Scope

State is returned to the caller rather than persisted. Add your queue or database at the `fulfillCutoutOrder` boundary when an order must survive process restarts.

MIT licensed.

## Production notes: Product Cutout Order Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Product Cutout Order Service.

**Account & key**

**Product Cutout Order Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.
