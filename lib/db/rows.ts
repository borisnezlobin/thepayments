import type { Chain, Order, OrderItem, OrderStatus, Product, Shop, ShopStatus, Withdrawal, WithdrawalStatus } from "../contract";

export interface ShopRow {
  id: string;
  slug: string;
  name: string;
  source_url: string;
  wallet_address: string | null;
  agent_discount_pct: number;
  status: ShopStatus;
  created_at: string;
}

export interface ProductRow {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  category: string | null;
  available: boolean;
  position: number;
  base_name: string | null;
  size_label: string | null;
}

export interface OrderRow {
  id: string;
  shop_id: string;
  buyer_id: string | null;
  pickup_name: string;
  items: OrderItem[];
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  status: OrderStatus;
  chain: Chain;
  tx_hash: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface WithdrawalRow {
  id: string;
  shop_id: string;
  amount_cents: number;
  tx_hash: string | null;
  status: WithdrawalStatus;
  created_at: string;
}

export function toShop(row: ShopRow): Shop {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sourceUrl: row.source_url,
    walletAddress: row.wallet_address,
    agentDiscountPct: row.agent_discount_pct,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    imageUrl: row.image_url,
    category: row.category,
    available: row.available,
    position: row.position,
    baseName: row.base_name,
    sizeLabel: row.size_label,
  };
}

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    shopId: row.shop_id,
    buyerId: row.buyer_id,
    pickupName: row.pickup_name,
    items: row.items,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    status: row.status,
    chain: row.chain,
    txHash: row.tx_hash,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

export function toWithdrawal(row: WithdrawalRow): Withdrawal {
  return {
    id: row.id,
    shopId: row.shop_id,
    amountCents: row.amount_cents,
    txHash: row.tx_hash,
    status: row.status,
    createdAt: row.created_at,
  };
}
