import { expect } from 'chai';
import { ethers } from 'hardhat';
describe('CoopGigJobRegistry',()=>{
 it('stores only hashes and follows the job lifecycle',async()=>{
  const [owner]=await ethers.getSigners();const C=await ethers.getContractFactory('CoopGigJobRegistry');const c=await C.deploy();
  const ref=ethers.keccak256(ethers.toUtf8Bytes('opaque-job-id'));const agreement=ethers.keccak256(ethers.toUtf8Bytes('agreement-hash'));
  await expect(c.createJob(ref,agreement)).to.emit(c,'JobCreated').withArgs(ref,agreement);
  await c.updateJobStatus(ref,1);await c.updateJobStatus(ref,2);
  await expect(c.updateJobStatus(ref,3)).to.emit(c,'JobStatusChanged');
  await expect(c.confirmCompletion(ref)).to.emit(c,'CustomerCompletionConfirmed');
  const record=await c.getJob(ref);expect(record.agreementHash).to.equal(agreement);expect(record.status).to.equal(4);
 });
 it('restricts writes to owner/operator and rejects invalid transitions',async()=>{
  const [owner,other]=await ethers.getSigners();const C=await ethers.getContractFactory('CoopGigJobRegistry');const c=await C.deploy();
  const ref=ethers.keccak256(ethers.toUtf8Bytes('ref'));const agreement=ethers.keccak256(ethers.toUtf8Bytes('agreement'));
  await expect(c.connect(other).createJob(ref,agreement)).to.be.revertedWith('NOT_OPERATOR');
  await c.createJob(ref,agreement);await expect(c.updateJobStatus(ref,3)).to.be.revertedWith('INVALID_TRANSITION');
 });
 it('records a credential content hash without accepting document data',async()=>{
  const [owner]=await ethers.getSigners();const C=await ethers.getContractFactory('CoopGigJobRegistry');const c=await C.deploy();const hash=ethers.keccak256(ethers.toUtf8Bytes('synthetic-certificate-content'));
  await expect(c.registerCredential(hash)).to.emit(c,'CredentialHashRegistered').withArgs(owner.address,hash);
  expect(await c.credentialHashes(owner.address,hash)).to.equal(true);
 });
});
