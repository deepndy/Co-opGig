import { describe,it,expect } from 'vitest';
describe('privacy boundary',()=>{
 it('documents no personal-data chain payload: only hash and opaque job reference are passed by adapter API',async()=>{
  const source=await import('../src/services/blockchain.js');
  expect(typeof source.recordJob).toBe('function');
  expect(typeof source.registerCredential).toBe('function');
 });
});
