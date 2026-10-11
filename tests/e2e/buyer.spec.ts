import { test, expect } from "@playwright/test";
test("directory reads the shared Track A contract", async ({ page }) => {
  await page.goto("/shops");
  await expect(
    page.getByRole("heading", { name: "Test Café", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Draft Café")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search shops" }).fill("missing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No shops match your search" }),
  ).toBeVisible();
});
test("storefront works without JavaScript and never enables unconnected payment", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/s/test-cafe");
  await expect(page.getByRole("heading", { name: "Oat latte" })).toBeVisible();
  await page
    .getByRole("spinbutton", { name: "Quantity for Oat latte", exact: true })
    .fill("2");
  await page
    .getByRole("spinbutton", { name: "Quantity for Green tea", exact: true })
    .fill("1");
  await expect(
    page.getByRole("spinbutton", { name: "Quantity for Croissant" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Update order total" }).click();
  await expect(
    page.getByRole("button", { name: "Pay $12.83 from wallet" }),
  ).toBeDisabled();
  await expect(page.getByText("2 × Oat latte")).toBeVisible();
  await expect(
    page.locator('head link[rel="alternate"][type="application/json"]'),
  ).toHaveAttribute("href", "http://127.0.0.1:3101/api/shops/test-cafe/menu");
  await page.screenshot({
    path: "test-results/storefront-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/storefront-mobile.png",
    fullPage: true,
  });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await context.close();
});
test("accounts show unavailable state and owner routes require sign-in", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeDisabled();
  await page.goto("/signup");
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeDisabled();
  await page.goto("/agent/invalid");
  await expect(
    page.getByRole("heading", { name: "This agent link is unavailable" }),
  ).toBeVisible();
});
test("MCP browser page and discovery file explain current capabilities", async ({
  page,
  request,
}) => {
  await page.goto("/mcp");
  await expect(
    page.getByRole("heading", { name: "Connect directly." }),
  ).toBeVisible();
  const llms = await request.get("/llms.txt");
  expect(await llms.text()).toContain("awaiting_approval");
});
test("MCP supports initialization, tool discovery, and a read-only menu request", async ({
  request,
}) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-03-26",
  };
  const call = (id: number, method: string, params: object) =>
    request.post("/mcp", {
      headers,
      data: { jsonrpc: "2.0", id, method, params },
    });
  const init = await call(1, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "track-c-test", version: "1.0" },
  });
  expect(init.ok()).toBe(true);
  expect(await init.text()).toContain("thepayments");
  const list = await call(2, "tools/list", {});
  expect(list.ok()).toBe(true);
  expect(await list.text()).toContain("find_shops");
  const menu = await call(3, "tools/call", {
    name: "get_menu",
    arguments: { slug: "test-cafe" },
  });
  expect(menu.ok()).toBe(true);
  expect(await menu.text()).toContain("Oat latte");
  const order = await call(4, "tools/call", {
    name: "place_order",
    arguments: {
      shopSlug: "test-cafe",
      items: [{ productId: "latte", qty: 1 }],
      pickupName: "Test",
      expectedTotalCents: 475,
      idempotencyKey: "be7c4218-e4f5-4176-87c5-6cb82fcaea64",
    },
  });
  expect(order.ok()).toBe(true);
  // Without the buyer's agent token, nothing is queued or paid.
  expect(await order.text()).toContain("authentication_required");
});
test("browser order endpoint blocks cross-origin and unauthenticated submissions", async ({
  request,
}) => {
  const crossOrigin = await request.post("/api/buyer/orders", {
    headers: { Origin: "https://evil.example" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  const anonymous = await request.post("/api/buyer/orders", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: {},
  });
  expect(anonymous.status()).toBe(401);
});
