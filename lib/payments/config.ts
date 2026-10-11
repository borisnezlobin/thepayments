import { parseAbi, hashDomain, type Hex } from "viem";
export const NETWORK = "eip155:84532" as const;
export const AUSD = "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC" as const;
export const DECIMALS = 6;
export const DOMAIN = {
  name: "Agora Dollar",
  version: "1",
  chainId: 84532,
  verifyingContract: AUSD,
} as const;
export const DOMAIN_HASH = hashDomain({
  domain: { ...DOMAIN, chainId: BigInt(DOMAIN.chainId) },
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
  },
});
export const abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function eip712Domain() view returns (bytes1,string,string,uint256,address,bytes32,uint256[])",
  "function balanceOf(address) view returns (uint256)",
  "function authorizationState(address,bytes32) view returns (bool)",
  "function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,uint8 v,bytes32 r,bytes32 s)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
  "event AuthorizationUsed(address indexed authorizer,bytes32 indexed nonce)",
]);
export const authorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;
export function centsToUnits(cents: number): bigint {
  if (!Number.isSafeInteger(cents) || cents <= 0)
    throw new Error("Amount must be positive integer cents");
  return BigInt(cents) * 10000n;
}
export function explorerUrl(txHash: Hex): string {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash))
    throw new Error("Invalid transaction hash");
  return `https://sepolia.basescan.org/tx/${txHash}`;
}
export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
