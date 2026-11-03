import { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes } from 'ethers';
import { config } from '../config.js';
const abi=[
 'function registerCredential(bytes32 credentialHash) external',
 'function createJob(bytes32 jobRef, bytes32 agreementHash) external',
 'function updateJobStatus(bytes32 jobRef,uint8 status) external',
 'function confirmCompletion(bytes32 jobRef) external',
 'function getJob(bytes32 jobRef) view returns (bytes32 agreementHash,uint8 status,uint64 updatedAt,bool exists)',
 'event CredentialHashRegistered(address indexed worker,bytes32 indexed credentialHash)',
 'event JobCreated(bytes32 indexed jobRef,bytes32 agreementHash)',
 'event JobStatusChanged(bytes32 indexed jobRef,uint8 status)',
 'event CustomerCompletionConfirmed(bytes32 indexed jobRef)'
];
const statusCode:Record<string,number>={OPEN:0,ACCEPTED:1,IN_PROGRESS:2,COMPLETED:3,CUSTOMER_CONFIRMED:4,CANCELLED:5};
export const hashText=(s:string)=>keccak256(toUtf8Bytes(s));
function contract(){
 if(!config.rpcUrl||!config.registryAddress||!config.signerKey) throw new Error('Blockchain adapter not configured');
 const provider=new JsonRpcProvider(config.rpcUrl);
 return new Contract(config.registryAddress,abi,new Wallet(config.signerKey,provider));
}
export async function recordJob(id:string,agreement:string){const c=contract();const ref=hashText(id);const tx=await c.createJob(ref,hashText(agreement));return (await tx.wait()).hash as string;}
export async function recordStatus(id:string,status:string){const c=contract();const tx=await c.updateJobStatus(hashText(id),statusCode[status]);return (await tx.wait()).hash as string;}
export async function confirmOnChain(id:string){const c=contract();const tx=await c.confirmCompletion(hashText(id));return (await tx.wait()).hash as string;}
export async function registerCredential(contentHash:string){const c=contract();if(!/^0x[0-9a-fA-F]{64}$/.test(contentHash)) throw new Error('Expected a bytes32 content hash');const tx=await c.registerCredential(contentHash);return (await tx.wait()).hash as string;}
export async function getChainJob(id:string){try{const c=contract();const j=await c.getJob(hashText(id));return {available:true,agreementHash:j.agreementHash,status:Number(j.status),updatedAt:Number(j.updatedAt),exists:j.exists};}catch{return {available:false,reason:'Blockchain RPC or registry is unavailable'};}}
