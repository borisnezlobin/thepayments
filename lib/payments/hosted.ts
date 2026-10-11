import { createPublicClient, http, parseAbiItem, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { generatePrivateKey } from "viem/accounts";
import { createRail } from "./rail";
import { AUSD } from "./config";
import { verifyAuthorization, PaymentError } from "./validation";
import type { Rail, Payment, Requirements } from "./types";
// Hosted settlement carries explicit AUSD requirements; never use an SDK dollar-price default.
export function createHostedRail(
  rpcUrl: string,
  facilitatorUrl = "https://x402.org/facilitator",
  fetcher: typeof fetch = fetch,
): Rail {
  const readRail = createRail(rpcUrl, generatePrivateKey()),
    client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  const endpoint = new URL(facilitatorUrl);
  if (endpoint.protocol !== "https:")
    throw new Error("Hosted facilitator requires HTTPS");
  async function post(method: string, p: Payment, r: Requirements) {
    const response = await fetcher(
      `${facilitatorUrl.replace(/\/$/, "")}/${method}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          x402Version: 2,
          paymentPayload: p,
          paymentRequirements: r,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new PaymentError(
        503,
        "Hosted facilitator unavailable; retry this checkout",
      );
    return response.json() as Promise<{
      isValid?: boolean;
      invalidReason?: string;
      success?: boolean;
      transaction?: string;
      errorReason?: string;
      network?: string;
    }>;
  }
  return {
    ...readRail,
    async verify(p, r) {
      await readRail.preflight();
      await verifyAuthorization(p, r);
      const response = await post("verify", p, r);
      if (response.isValid !== true)
        throw new PaymentError(
          402,
          response.invalidReason ?? "Hosted verification failed",
        );
    },
    hosted: {
      async startBlock() {
        await readRail.preflight();
        return (await client.getBlockNumber()).toString();
      },
      async settle(p, r) {
        const response = await post("settle", p, r);
        if (
          response.network !== "eip155:84532" ||
          !response.transaction ||
          !/^0x[0-9a-fA-F]{64}$/.test(response.transaction)
        )
          throw new PaymentError(
            503,
            "Settlement outcome unknown; retry same checkout for reconciliation",
          );
        // Even success:false/settlement_pending with a hash must be reconciled against chain.
        return response.transaction as Hex;
      },
      async reconcile(p, startBlock) {
        await readRail.preflight();
        const a = p.payload.authorization;
        const logs = await client.getLogs({
          address: AUSD,
          event: parseAbiItem(
            "event AuthorizationUsed(address indexed authorizer,bytes32 indexed nonce)",
          ),
          args: { authorizer: a.from, nonce: a.nonce },
          fromBlock: BigInt(startBlock),
          toBlock: "latest",
        });
        return logs[0]?.transactionHash ?? null;
      },
    },
  };
}
