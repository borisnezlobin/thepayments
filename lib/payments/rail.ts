import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseSignature,
  decodeEventLog,
  type Address,
  type Hex,
  type PrivateKeyAccount,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import type { FacilitatorEvmSigner } from "@x402/evm";
import type { ReadContractParameters, VerifyTypedDataParameters } from "viem";
import { publicActions } from "viem";
import { AUSD, abi, DOMAIN_HASH } from "./config";
import {
  message,
  sameAddress,
  verifyAuthorization,
  PaymentError,
} from "./validation";
import type { Payment, Rail, Requirements } from "./types";
export function createRail(
  rpcUrl: string,
  privateKey: Hex | PrivateKeyAccount,
): Rail & { preflight(): Promise<unknown> } {
  const account =
    typeof privateKey === "string"
      ? privateKeyToAccount(privateKey)
      : privateKey;
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl, { timeout: 10000 }),
  });
  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl, { timeout: 10000 }),
  }).extend(publicActions);
  const signer: FacilitatorEvmSigner = {
    getAddresses: () => [account.address],
    readContract: (args) =>
      publicClient.readContract(args as ReadContractParameters),
    verifyTypedData: (args) =>
      publicClient.verifyTypedData(args as VerifyTypedDataParameters),
    getCode: (args) => publicClient.getCode(args),
    // Settlement uses our persisted raw transaction path, never the SDK broadcaster.
    writeContract: async () => {
      throw new Error("Use durable settlement");
    },
    sendTransaction: async () => {
      throw new Error("Use durable settlement");
    },
    waitForTransactionReceipt: (args) =>
      publicClient.waitForTransactionReceipt(args),
  };
  const sdk = new ExactEvmScheme(signer, { simulateInSettle: true });
  let validated: Promise<unknown> | undefined;
  const preflight = () =>
    (validated ??= (async () => {
      if ((await publicClient.getChainId()) !== 84532)
        throw new Error("Refusing non-Base-Sepolia RPC");
      const [decimals, domain, separator] = await Promise.all([
        publicClient.readContract({
          address: AUSD,
          abi,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: AUSD,
          abi,
          functionName: "eip712Domain",
        }),
        publicClient.readContract({
          address: AUSD,
          abi,
          functionName: "DOMAIN_SEPARATOR",
        }),
      ]);
      if (
        decimals !== 6 ||
        separator.toLowerCase() !== DOMAIN_HASH.toLowerCase()
      )
        throw new Error(
          "AUSD decimals/domain changed; refusing to sign or settle",
        );
      return {
        chainId: 84532,
        address: AUSD,
        decimals,
        domain: domain.map((v) => (typeof v === "bigint" ? v.toString() : v)),
        separator,
      };
    })().catch((e) => {
      validated = undefined;
      throw e;
    }));
  return {
    facilitatorAddress: account.address,
    preflight,
    async getBalance(address: Address) {
      await preflight();
      return publicClient.readContract({
        address: AUSD,
        abi,
        functionName: "balanceOf",
        args: [address],
      });
    },
    async pendingNonce() {
      await preflight();
      return publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      });
    },
    async verify(payment: Payment, r: Requirements) {
      await preflight();
      await verifyAuthorization(payment, r);
      const verification = await sdk.verify(payment, r);
      if (!verification.isValid)
        throw new PaymentError(
          402,
          verification.invalidReason ?? "Payment verification failed",
        );
    },
    async prepare(payment: Payment, nonce: number) {
      await preflight();
      const a = message(payment),
        sig = parseSignature(payment.payload.signature);
      const { request } = await publicClient.simulateContract({
        account,
        address: AUSD,
        abi,
        functionName: "transferWithAuthorization",
        args: [
          a.from,
          a.to,
          a.value,
          a.validAfter,
          a.validBefore,
          a.nonce,
          Number(sig.v ?? BigInt(sig.yParity!) + 27n),
          sig.r,
          sig.s,
        ],
      });
      const { encodeFunctionData } = await import("viem");
      const tx = await wallet.prepareTransactionRequest({
        to: AUSD,
        data: encodeFunctionData({
          abi,
          functionName: "transferWithAuthorization",
          args: request.args,
        }),
        nonce,
      });
      const rawTx = await wallet.signTransaction(tx);
      return { rawTx, txHash: keccak256(rawTx) };
    },
    async broadcast(rawTx: Hex, txHash: Hex) {
      await preflight();
      try {
        await publicClient.sendRawTransaction({ serializedTransaction: rawTx });
      } catch (e) {
        // If a retry encounters already-known/nonce-too-low, only proceed when OUR hash exists.
        try {
          await publicClient.getTransaction({ hash: txHash });
        } catch {
          throw e;
        }
      }
    },
    async confirm(txHash: Hex, payment: Payment) {
      await preflight();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 2,
        timeout: 45000,
      });
      validateSettlementReceipt(receipt, payment);
      return receipt;
    },
  };
}

export function validateSettlementReceipt(
  receipt: Pick<TransactionReceipt, "status" | "logs">,
  payment: Payment,
): void {
  if (receipt.status !== "success")
    throw new PaymentError(502, "Settlement reverted; order remains unpaid");
  const a = payment.payload.authorization;
  let transferred = false,
    authorized = false;
  for (const log of receipt.logs) {
    if (!sameAddress(log.address, AUSD)) continue;
    try {
      const event = decodeEventLog({ abi, data: log.data, topics: log.topics });
      if (event.eventName === "Transfer")
        transferred ||=
          sameAddress(event.args.from, a.from) &&
          sameAddress(event.args.to, a.to) &&
          event.args.value === BigInt(a.value);
      if (event.eventName === "AuthorizationUsed")
        authorized ||=
          sameAddress(event.args.authorizer, a.from) &&
          event.args.nonce.toLowerCase() === a.nonce.toLowerCase();
    } catch {}
  }
  if (!transferred || !authorized)
    throw new PaymentError(
      502,
      "Settlement receipt did not prove this payment",
    );
}
