import { localWallets } from "./local-wallets.js";
import { requirements, signPayment } from "../../../lib/payments/service.js";
const { roles, vault } = await localWallets();
const r = requirements(roles.merchant.walletAddress, 500),
  p = await signPayment(await vault.account(roles.buyer), r);
const response = await fetch("https://x402.org/facilitator/verify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    x402Version: 2,
    paymentPayload: p,
    paymentRequirements: r,
  }),
});
const result = (await response.json()) as {
  isValid: boolean;
  invalidReason?: string;
};
console.log("Hosted AUSD verify probe", response.status, {
  isValid: result.isValid,
  invalidReason: result.invalidReason,
});
console.log(
  "No settlement requested; failed verification is not proof of token support.",
);
