import "server-only";
import { SHOP_ADMIN_TOKEN_HEADER, type Shop } from "../contract";
import { HttpError } from "../http";
import { findShopByToken } from "./repository";

export async function requireShopOwner(request: Request, slug: string): Promise<Shop> {
  const token = request.headers.get(SHOP_ADMIN_TOKEN_HEADER) ?? "";
  const shop = await findShopByToken(token);
  if (!shop || shop.slug !== slug) throw new HttpError(401, "This link doesn't open that shop's dashboard.");
  return shop;
}
