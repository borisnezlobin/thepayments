import type { BuyerCheckout } from "./buyer";
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function checkoutRetryResponse(
  input: BuyerCheckout,
  message: string,
  status: number,
) {
  const fields = {
    shopSlug: input.shopSlug,
    items: JSON.stringify(input.items),
    pickupName: input.pickupName,
    expectedTotalCents: String(input.expectedTotalCents),
    idempotencyKey: input.idempotencyKey,
  };
  const hidden = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${name}" value="${escape(value)}">`,
    )
    .join("");
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Checkout status</title><body><main><h1>Checkout could not be confirmed</h1><p role="alert">${escape(message)}</p><form action="/api/buyer/orders" method="post">${hidden}<button type="submit">Retry this checkout</button></form><p>Keep this checkout open until its payment status is confirmed.</p></main></body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
