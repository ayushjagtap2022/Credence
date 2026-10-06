import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from root .env first, then backend/.env
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else {
  dotenv.config();
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'blockexam_super_secure_jwt_secret_key_2026_dev',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  BLOCKCHAIN_RPC_URL:
    process.env.BLOCKCHAIN_RPC_URL ||
    process.env.SEPOLIA_RPC_URL ||
    'http://127.0.0.1:8545',
  DEPLOYER_PRIVATE_KEY:
    process.env.DEPLOYER_PRIVATE_KEY ||
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://blockexam.vercel.app',
  DATABASE_URL: process.env.DATABASE_URL || '',
};
