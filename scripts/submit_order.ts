export {};

const response = await fetch("http://localhost:3000/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    orderId: "order-1042",
    sku: "canvas-tote-natural",
    customerEmail: "buyer@example.com",
    image: { url: "https://example.com/catalog/canvas-tote.jpg" }
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
