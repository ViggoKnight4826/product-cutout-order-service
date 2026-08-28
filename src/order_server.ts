import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiCutoutClient, InfraiError } from "./infrai_cutout.js";
import { checkoutSchema, fulfillCutoutOrder } from "./order_fulfillment.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const client = new InfraiCutoutClient(apiKey);
const port = Number(process.env.PORT ?? 3000);

function send(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/orders") {
    send(res, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const checkout = checkoutSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    send(res, 201, await fulfillCutoutOrder(checkout, client));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(res, 400, { error: "Invalid order request" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(res, status, { error: error.code });
      return;
    }
    send(res, 502, { error: "Order processing failed" });
  }
}).listen(port, () => console.log(`Order service listening on http://localhost:${port}`));
