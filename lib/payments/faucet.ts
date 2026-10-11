import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
  keccak256,
  type PrivateKeyAccount,
  type Hex,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";
import { AUSD, abi, explorerUrl } from "./config";
export const AUSD_FAUCET =
  "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C" as const;
// Agora's official guide specifies requestFunds(address), not requestFunds().
export const faucetAbi = parseAbi(["function requestFunds(address recipient)"]);
export type FaucetTx = { rawTx: Hex; txHash: Hex };
export async function requestFaucetFunds(options: {
  rpcUrl: string;
  account: PrivateKeyAccount;
  recipient: Address;
  load: () => Promise<FaucetTx | null>;
  save: (tx: FaucetTx) => Promise<void>;
}) {
  const { rpcUrl, account, recipient } = options;
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
  if ((await client.getChainId()) !== 84532)
    throw new Error("Faucet requires Base Sepolia");
  if (!(await client.getCode({ address: AUSD_FAUCET })))
    throw new Error("Faucet not deployed");
  let tx = await options.load();
  if (!tx) {
    if ((await client.getBalance({ address: account.address })) === 0n)
      throw new Error(
        `Fund caller ${account.address} with Base Sepolia ETH before requesting AUSD for ${recipient}`,
      );
    const wallet = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
    await client.simulateContract({
      account,
      address: AUSD_FAUCET,
      abi: faucetAbi,
      functionName: "requestFunds",
      args: [recipient],
    });
    const prepared = await wallet.prepareTransactionRequest({
      to: AUSD_FAUCET,
      data: encodeFunctionData({
        abi: faucetAbi,
        functionName: "requestFunds",
        args: [recipient],
      }),
    });
    const rawTx = await wallet.signTransaction(prepared);
    tx = { rawTx, txHash: keccak256(rawTx) };
    await options.save(tx);
  }
  try {
    await client.sendRawTransaction({ serializedTransaction: tx.rawTx });
  } catch (e) {
    try {
      await client.getTransaction({ hash: tx.txHash });
    } catch {
      throw e;
    }
  }
  const receipt = await client.waitForTransactionReceipt({
    hash: tx.txHash,
    confirmations: 2,
    timeout: 45000,
  });
  if (receipt.status !== "success")
    throw new Error("Faucet transaction reverted");
  const units = await client.readContract({
    address: AUSD,
    abi,
    functionName: "balanceOf",
    args: [recipient],
  });
  return {
    txHash: tx.txHash,
    explorerUrl: explorerUrl(tx.txHash),
    recipient,
    units: units.toString(),
  };
}
