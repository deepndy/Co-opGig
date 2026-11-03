import { ethers } from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';
async function main(){
 const Registry=await ethers.getContractFactory('CoopGigJobRegistry');
 const registry=await Registry.deploy();await registry.waitForDeployment();
 const address=await registry.getAddress();const network=await ethers.provider.getNetwork();
 const output={address,chainId:Number(network.chainId),deployedAt:new Date().toISOString()};
 fs.writeFileSync(path.join(__dirname,'..','deployment.local.json'),JSON.stringify(output,null,2));
 console.log('CoopGigJobRegistry deployed:',output);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
