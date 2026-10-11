import { createRail } from "../../../lib/payments/rail.js";
import { generatePrivateKey } from "viem/accounts";
import type { Hex } from "viem";
const rail = createRail(
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
  (process.env.FACILITATOR_PRIVATE_KEY as Hex) ?? generatePrivateKey(),
);
console.log(JSON.stringify(await rail.preflight(), null, 2));
console.log("facilitatorAddress", rail.facilitatorAddress);
console.log(
  "AUSD balance (units)",
  (await rail.getBalance(rail.facilitatorAddress)).toString(),
);
const url =
  process.env.HOSTED_FACILITATOR_URL ?? "https://x402.org/facilitator";
try {
  const response = await fetch(`${url}/supported`);
  console.log(
    "Hosted advertised capabilities (not token proof)",
    await response.json(),
  );
} catch {
  console.log(
    "Hosted capability endpoint unreachable; local settlement remains available",
  );
}
