import { appOrigin } from "@/lib/config";
export function GET() {
  const origin = appOrigin();
  return new Response(
    `# The Payments\n\nBuyer storefronts for pickup orders from local shops.\n\n## Discovery\n- Shop directory: ${origin}/shops\n- Storefront: ${origin}/s/{slug}\n- Agent instructions: ${origin}/agents\n- MCP Streamable HTTP: ${origin}/mcp\n- Tools: find_shops, get_menu, place_order\n\n## Browser ordering\nSign in using a private agent link supplied by the buyer. Do not request a password.\nOpen a storefront, choose quantities, update the order total, and enter a pickup name.\nMenus are server-rendered HTML and advertise the merchant's JSON menu via rel=alternate.\nMoney is integer USD cents; the menu's agent prices include the shop discount.\n\n## Current availability\nShop discovery requires the merchant catalog connection.\nWallet funding, order placement, payment confirmation, and order history are not connected yet.\nplace_order returns payment_integration_pending. No payment or order is simulated.\nNever claim an order is paid without a confirmed result from the payment integration.\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
