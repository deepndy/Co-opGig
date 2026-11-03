import 'dotenv/config';
export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'local-only-change-this-secret-at-least-32-chars',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  aiUrl: process.env.AI_SERVICE_URL || '',
  remoteUrl: process.env.REMOTE_SENSING_SERVICE_URL || '',
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || '',
  chainId: Number(process.env.BLOCKCHAIN_CHAIN_ID || 31337),
  registryAddress: process.env.COOPGIG_REGISTRY_ADDRESS || '',
  signerKey: process.env.BLOCKCHAIN_SIGNER_PRIVATE_KEY || ''
};
export const categories = ['electrician','plumber','carpenter','painter','cleaner','gardener','driver','caregiver','technician','domestic-helper','mason','appliance-repair'] as const;
