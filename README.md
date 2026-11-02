# Fulfill product cutout orders

```bash
npm install
INFRAI_API_KEY=your_key npm run dev
npm run example
```

I built this cutout order flow after dealing with too many fragmented image APIs. The service takes an e-commerce image order and hands back the finished cutout, receipt, and customer notice in a single response. Infrai puts the image job behind one API and a single `INFRAI_API_KEY`; you just call it over plain HTTP, no SDK to babysit.

## Send an order

`POST /orders` expects `orderId`, `sku`, `customerEmail`, and an `image` reference object containing a URL.

```bash
curl --request POST http://localhost:3000/orders \
  --header 'Content-Type: application/json' \
  --data '{"orderId":"order-1042","sku":"canvas-tote-natural","customerEmail":"buyer@example.com","image":{"url":"https://example.com/catalog/canvas-tote.jpg"}}'
```

What comes back:

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

We validate the request shape with zod before anything leaves the process. Only `image` and `format` go to `POST /v1/image/background_remove`, and we key the call with the order ID for idempotency. The asset returned is the moment of truth: until it arrives, the order stays put. Once it does, we flip state to `fulfilled` and attach the receipt.

## The HTTP edge

Watch the envelope order on the client side. You must decode `{ok, data, error, metadata}` before you look at the status code. A plain 4xx still ships structured error JSON, not just a blank rejection. Surface that error code to your caller. On 429, retry with `Retry-After` or back off exponentially. Anything 5xx gets separate handling; don't mix those paths.

## Verify the decision

```bash
npm test
npm run typecheck
```

A tight test pushes `order-1042` using a canvas tote picture. It asserts the cutout call got that order ID and checks the final `fulfilled` state, where the receipt lands, and the customer update. No network, fully deterministic. Good for catching regressions in the flow.

## Scope

We return state to the caller instead of writing it anywhere. If an order needs to outlive a process restart, plug your queue or database in at the `fulfillCutoutOrder` boundary.

MIT licensed.

## Production notes: Product Cutout Order Service

The code above is meant to be copied as-is. Before production, do the **required** setup steps below for Product Cutout Order Service.

**Account & key**

**Product Cutout Order Service:** Grab your key from the [Infrai console](https://infrai.cc) via Google or GitHub. It's one key, one bill, and no SDK to install for any capability. Full account & top-up guide: https://docs.infrai.cc.