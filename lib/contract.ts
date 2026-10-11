export type ShopStatus = "draft" | "live";
export type OrderStatus = "awaiting_payment" | "paid" | "ready" | "picked_up";
export type Chain = "base-sepolia" | "xrpl-testnet";
export type WithdrawalStatus = "pending" | "sent" | "failed";

export interface Shop {
  id: string;
  slug: string;
  name: string;
  sourceUrl: string;
  walletAddress: string | null;
  agentDiscountPct: number;
  status: ShopStatus;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: string | null;
  available: boolean;
  position: number;
  baseName: string | null;
  sizeLabel: string | null;
}

export interface Buyer {
  id: string;
  email: string;
  walletAddress: string | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  shopId: string;
  buyerId: string | null;
  pickupName: string;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  status: OrderStatus;
  chain: Chain;
  txHash: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface Withdrawal {
  id: string;
  shopId: string;
  amountCents: number;
  txHash: string | null;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface MenuItem {
  productId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  priceCents: number;
  agentPriceCents: number;
  baseName?: string | null;
  sizeLabel?: string | null;
}

export interface ShopMenu {
  shop: Pick<Shop, "slug" | "name" | "agentDiscountPct">;
  items: MenuItem[];
}

export interface ShopSummary {
  slug: string;
  name: string;
  agentDiscountPct: number;
  itemCount: number;
}

export interface ImportShopRequest {
  url: string;
}

export interface ImportShopResponse {
  shop: Shop;
  products: Product[];
  adminToken: string;
  warnings: string[];
}

export interface ProductEdit {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  baseName?: string | null;
  sizeLabel?: string | null;
}

export interface UpdateShopRequest {
  name?: string;
  agentDiscountPct?: number;
  publish?: boolean;
  products?: ProductEdit[];
}

export interface CreateOrderRequest {
  items: { productId: string; qty: number }[];
  pickupName: string;
}

export interface ApiError {
  error: string;
}

export const SHOP_ADMIN_TOKEN_HEADER = "x-shop-token";
