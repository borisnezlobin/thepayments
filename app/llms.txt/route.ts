import { appOrigin } from "@/lib/config";
export function GET() {
  const origin = appOrigin();
  return new Response(
    `# The Payments\n\nBuyer storefronts for pickup orders from local shops.\n\n## Discovery\n- Shop directory: ${origin}/shops\n- Storefront: ${origin}/s/{slug}\n- Agent instructions: ${origin}/agents\n- MCP Streamable HTTP: ${origin}/mcp\n- Tools: find_shops, get_menu, place_order\n\n## Browser ordering\nSign in by pasting the buyer's agent access token at ${origin}/agents/connect. It works once. Your browser then stays signed in for 90 days. Do not request a password.\nOpen a storefront, choose quantities, update the order total and enter a pickup name. Then send the order for approval.\nThe buyer approves every agent order on their account page before anything is charged. Follow the status page you are sent to.\nMenus are server-rendered HTML and advertise the merchant's JSON menu via rel=alternate.\nMoney is integer USD cents; the menu's agent prices include the shop discount.\n\n## Current availability\nShop discovery requires the merchant catalog connection.\nAgents can't create or fund a wallet.\nplace_order needs an agent session token as a Bearer token. Get it once by sending POST ${origin}/api/buyer/agent-session with the JSON body {\"token\": \"<agent access token>\"}. place_order returns awaiting_approval and never pays by itself. No payment or order is simulated.\nNever claim an order is paid without a confirmed result from the payment integration.\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
