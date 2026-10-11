import { getPrincipal } from "@/lib/buyer/auth";
import { placeBuyerOrder } from "@/lib/buyer/checkout";
import { checkoutSchema } from "@/lib/buyer/schemas";
import { appOrigin } from "@/lib/config";
import { IntegrationUnavailable, InvalidOrder } from "@/lib/errors";
const noStore = { "Cache-Control": "no-store" };
async function readBody(request: Request, type: string): Promise<unknown> {
  if (type.includes("application/json")) return request.json();
  const form = await request.formData();
  return {
    shopSlug: form.get("shopSlug"),
    items: JSON.parse(String(form.get("items"))),
    pickupName: form.get("pickupName"),
    expectedTotalCents: Number(form.get("expectedTotalCents")),
    idempotencyKey: form.get("idempotencyKey"),
  };
}
function failure(error: unknown) {
  if (error instanceof InvalidOrder)
    return Response.json(
      { error: "invalid_order", message: error.message },
      { status: 409, headers: noStore },
    );
  if (error instanceof IntegrationUnavailable)
    return Response.json(
      {
        error: "payment_integration_pending",
        message:
          "Wallet checkout is not connected. No payment was taken and no order was created.",
      },
      { status: 503, headers: noStore },
    );
  return Response.json({ error: "order_failed" }, { status: 500 });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    return Response.json({ error: "origin_not_allowed" }, { status: 403 });
  const principal = await getPrincipal();
  if (!principal)
    return Response.json({ error: "authentication_required" }, { status: 401 });
  const type = request.headers.get("content-type") || "";
  const isForm =
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data");
  if (!isForm && !type.includes("application/json"))
    return Response.json(
      { error: "unsupported_content_type" },
      { status: 415 },
    );
  let body: unknown;
  try {
    body = await readBody(request, type);
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
    const { request: held } = await placeBuyerOrder(principal, parsed.data);
    const statusUrl = `${appOrigin()}/requests/${held.id}`;
    // A browser agent lands on a page it can read. API clients get JSON.
    if (isForm) return Response.redirect(statusUrl, 303);
    return Response.json(
      {
        status: "awaiting_approval",
        requestId: held.id,
        totalCents: held.totalCents,
        expiresAt: held.expiresAt,
        statusUrl,
        message:
          "The account owner must approve this order. No payment has been taken yet.",
      },
      { status: 202, headers: noStore },
    );
  } catch (error) {
    return failure(error);
  }
}
