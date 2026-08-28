import { z } from "zod";
import type { CutoutAsset } from "./infrai_cutout.js";

export const checkoutSchema = z.object({
  orderId: z.string().min(1).max(80),
  sku: z.string().min(1).max(80),
  customerEmail: z.string().email(),
  image: z.object({
    url: z.string().url()
  }).strict()
}).strict();

export type Checkout = z.infer<typeof checkoutSchema>;

export interface CutoutPort {
  removeBackground(image: Checkout["image"], orderId: string): Promise<CutoutAsset>;
}

export interface FulfilledOrder {
  orderId: string;
  sku: string;
  state: "fulfilled";
  asset: CutoutAsset;
  receipt: {
    orderId: string;
    deliveredTo: string;
    item: "transparent-product-image";
  };
  customerUpdate: string;
}

export async function fulfillCutoutOrder(
  input: Checkout,
  cutouts: CutoutPort
): Promise<FulfilledOrder> {
  const checkout = checkoutSchema.parse(input);
  const asset = await cutouts.removeBackground(checkout.image, checkout.orderId);

  return {
    orderId: checkout.orderId,
    sku: checkout.sku,
    state: "fulfilled",
    asset,
    receipt: {
      orderId: checkout.orderId,
      deliveredTo: checkout.customerEmail,
      item: "transparent-product-image"
    },
    customerUpdate: `Cutout for ${checkout.sku} is ready`
  };
}
