import { describe, expect, it } from "vitest";
import { fulfillCutoutOrder } from "../src/order_fulfillment.js";

describe("order fulfillment", () => {
  it("fulfills checkout only after the cutout asset is returned", async () => {
    const result = await fulfillCutoutOrder({
      orderId: "order-1042",
      sku: "canvas-tote-natural",
      customerEmail: "buyer@example.com",
      image: { url: "https://example.com/catalog/canvas-tote.jpg" }
    }, {
      removeBackground: async (image, orderId) => {
        expect(image).toEqual({ url: "https://example.com/catalog/canvas-tote.jpg" });
        expect(orderId).toBe("order-1042");
        return { id: "asset-cutout-1042" };
      }
    });

    expect(result.state).toBe("fulfilled");
    expect(result.receipt).toEqual({
      orderId: "order-1042",
      deliveredTo: "buyer@example.com",
      item: "transparent-product-image"
    });
    expect(result.customerUpdate).toBe("Cutout for canvas-tote-natural is ready");
  });
});
