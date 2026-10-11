import type { Address, Hex, TransactionReceipt } from "viem";
export type Shop = {
  id: string;
  slug: string;
  name: string;
  walletAddress: Address;
  agentDiscountPct: number;
  status: "draft" | "live";
};
export type Product = {
  id: string;
  shopId: string;
  name: string;
  priceCents: number;
  available: boolean;
};
export type OrderInput = {
  buyerId?: string;
  pickupName: string;
  items: { productId: string; qty: number }[];
};
export type Order = Omit<OrderInput, "items" | "buyerId"> & {
  buyerId: string | null;
  items: {
    productId: string;
    name: string;
    qty: number;
    unitPriceCents: number;
  }[];
  paidAt: string | null;
  id: string;
  shopId: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  status: "awaiting_payment" | "paid" | "ready" | "picked_up";
  chain: "base-sepolia";
  txHash: Hex | null;
  createdAt: string;
};
export type Wallet = { id: string; walletAddress: Address };
export type StoredWallet = Wallet & { encryptedKey: string };
export type Withdrawal = {
  id: string;
  shopId: string;
  amountCents: number;
  txHash: Hex | null;
  status: "pending" | "sent";
  createdAt: string;
};
export type Intent = {
  key: string;
  checkoutKey?: string;
  binding: string;
  order: Order | null;
  withdrawal: Withdrawal | null;
  payment: Payment;
  state: "reserved" | "prepared" | "hosted" | "confirmed";
  rawTx: Hex | null;
  txHash: Hex | null;
  startBlock?: string;
};
// claim is an atomic insert; existing records are immutable in identity and binding.
export interface Repository {
  getShop(slug: string): Promise<Shop | null>;
  getProducts(shopId: string, ids: string[]): Promise<Product[]>;
  getBuyerAddress(id: string): Promise<Address | null>;
  saveWallet(wallet: StoredWallet): Promise<void>;
  getWallet(id: string): Promise<StoredWallet | null>;
  findWallet(address: Address): Promise<StoredWallet | null>;
  claim(intent: Intent): Promise<{ created: boolean; intent: Intent }>;
  getCheckout(key: string): Promise<Intent | null>;
  startHosted(key: string, startBlock: string): Promise<void>;
  recordHostedHash(key: string, txHash: Hex): Promise<void>;
  getIntent(key: string): Promise<Intent | null>;
  prepare(key: string, rawTx: Hex, txHash: Hex): Promise<void>;
  complete(key: string): Promise<Intent>;
  getClientPayment(key: string): Promise<Payment | null>;
  saveClientPayment(key: string, payment: Payment): Promise<Payment>;
  getOrder(id: string): Promise<Order | null>;
  // Monotonic nonce allocation across ALL processes using this facilitator account.
  allocateNonce(address: Address, chainPendingNonce: number): Promise<number>;
}
export interface Rail {
  hosted?: {
    startBlock(): Promise<string>;
    settle(payment: Payment, requirements: Requirements): Promise<Hex>;
    reconcile(payment: Payment, startBlock: string): Promise<Hex | null>;
  };
  getBalance(address: Address): Promise<bigint>;
  verify(payload: Payment, requirements: Requirements): Promise<void>;
  prepare(
    payload: Payment,
    nonce: number,
  ): Promise<{ rawTx: Hex; txHash: Hex }>;
  pendingNonce(): Promise<number>;
  readonly facilitatorAddress: Address;
  broadcast(rawTx: Hex, txHash: Hex): Promise<void>;
  confirm(txHash: Hex, payment: Payment): Promise<TransactionReceipt | void>;
}
export type Requirements = {
  scheme: "exact";
  network: "eip155:84532";
  amount: string;
  asset: Address;
  payTo: Address;
  maxTimeoutSeconds: number;
  extra: { name: string; version: string; assetTransferMethod: "eip3009" };
};
export type Authorization = {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
};
export type Payment = {
  x402Version: 2;
  resource?: { url: string };
  accepted: Requirements;
  payload: { signature: Hex; authorization: Authorization };
};
