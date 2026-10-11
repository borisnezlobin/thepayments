import {createPublicClient,http,decodeEventLog,formatEther} from 'viem';
import {baseSepolia} from 'viem/chains';
import {AUSD,abi} from '../../../lib/payments/config.js';
import {sameAddress} from '../../../lib/payments/validation.js';
import {localWallets} from './local-wallets.js';
const {roles}=await localWallets(),client=createPublicClient({chain:baseSepolia,transport:http(process.env.BASE_SEPOLIA_RPC_URL??'https://sepolia.base.org')});
if(await client.getChainId()!==84532)throw new Error('Wrong chain');
const expected=[
 {action:'faucet',hash:'0x2a54567ef726440a211e1af8761750767233aca2341b404cc1c54ddb4e2adfcc' as const,from:'0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C',to:roles.treasury.walletAddress,amount:10000000000n},
 {action:'buyer funding',hash:'0xfdd45a36eca3b8919092314b49555c289a4aabcf0d92aff362def3cd9e03f143' as const,from:roles.treasury.walletAddress,to:roles.buyer.walletAddress,amount:100000000n},
 {action:'checkout',hash:'0xf03221cb46081ee5bce14092c396d7ad9fd8195e159ac82abdb5b77dffd62173' as const,from:roles.buyer.walletAddress,to:roles.merchant.walletAddress,amount:5000000n},
];
for(const e of expected){const [receipt,tx]=await Promise.all([client.getTransactionReceipt({hash:e.hash}),client.getTransaction({hash:e.hash})]);
 if(receipt.status!=='success')throw new Error(`${e.action} not successful`);
 const events=receipt.logs.filter(l=>sameAddress(l.address,AUSD)).flatMap(l=>{try{return [decodeEventLog({abi,data:l.data,topics:l.topics})];}catch{return [];}});
 const transfer=events.find(event=>event.eventName==='Transfer'&&sameAddress(event.args.from,e.from)&&sameAddress(event.args.to,e.to)&&event.args.value===e.amount);
 if(!transfer){console.log('Actual AUSD Transfer events',events.filter(event=>event.eventName==='Transfer'));throw new Error(`${e.action} transfer mismatch`);}
 if(e.action!=='faucet'&&!events.some(event=>event.eventName==='AuthorizationUsed'&&sameAddress(event.args.authorizer,e.from)))throw new Error('Missing ERC-3009 authorization event');
 console.log(JSON.stringify({action:e.action,hash:e.hash,status:receipt.status,block:receipt.blockNumber.toString(),transactionSender:tx.from,token:AUSD,tokenSender:e.from,recipient:e.to,amountAUSD:Number(e.amount)/1000000,explorerUrl:`https://sepolia.basescan.org/tx/${e.hash}`}));
}
console.log('Treasury remaining ETH',formatEther(await client.getBalance({address:roles.treasury.walletAddress})));
