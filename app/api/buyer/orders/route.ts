import { getPrincipal } from "@/lib/buyer/auth";
import { placeBuyerOrder } from "@/lib/buyer/checkout";
import { checkoutSchema } from "@/lib/buyer/schemas";
import { appOrigin } from "@/lib/config";
import { IntegrationUnavailable } from "@/lib/errors";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    return Response.json({ error: "origin_not_allowed" }, { status: 403 });
  const principal = await getPrincipal();
  if (!principal)
    return Response.json({ error: "authentication_required" }, { status: 401 });
  const type = request.headers.get("content-type") || "";
  let body: unknown;
  try {
    if (type.includes("application/json")) body = await request.json();
    else if (
      type.includes("application/x-www-form-urlencoded") ||
      type.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      body = {
        shopSlug: form.get("shopSlug"),
        items: JSON.parse(String(form.get("items"))),
        pickupName: form.get("pickupName"),
        expectedTotalCents: Number(form.get("expectedTotalCents")),
        idempotencyKey: form.get("idempotencyKey"),
      };
    } else
      return Response.json(
        { error: "unsupported_content_type" },
        { status: 415 },
      );
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "invalid_order", details: parsed.error.flatten() },
      { status: 400 },
    );
  try {
    return Response.json(await placeBuyerOrder(principal, parsed.data));
  } catch (error) {
    if (error instanceof IntegrationUnavailable)
      return Response.json(
        {
          error: "payment_integration_pending",
          message:
            "Wallet checkout is not connected. No payment was taken and no order was created.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json({ error: "order_failed" }, { status: 500 });
  }
}
