import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.contractAddress = null;
    this.abi = null;
    this.isReady = false;

    this.init();
  }

  init() {
    try {
      const contractDataPath = path.resolve(__dirname, '../../../config/contractData.json');

      if (!fs.existsSync(contractDataPath)) {
        console.warn(`[BlockchainService] Warning: ${contractDataPath} not found. Contract interactions will be mocked until deployed.`);
        return;
      }

      const raw = fs.readFileSync(contractDataPath, 'utf8');
      const contractData = JSON.parse(raw);

      this.contractAddress = env.CONTRACT_ADDRESS || contractData.address;
      this.abi = contractData.abi;

      const rpcUrl = env.BLOCKCHAIN_RPC_URL;
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Normalize private key
      let privateKey = env.DEPLOYER_PRIVATE_KEY;
      if (privateKey && !privateKey.startsWith('0x')) {
        privateKey = `0x${privateKey}`;
      }

      if (privateKey && privateKey.length === 66) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.wallet);
        this.isReady = true;
        console.log(`[BlockchainService] Initialized with contract at ${this.contractAddress} via ${rpcUrl}`);
      } else {
        // Read-only contract
        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
        console.warn('[BlockchainService] No valid DEPLOYER_PRIVATE_KEY provided. Contract is in read-only mode.');
      }
    } catch (error) {
      console.error('[BlockchainService] Initialization error:', error.message);
    }
  }

  /**
   * Helper to ensure provider connection or fallback gracefully
   */
  async ensureContract() {
    if (!this.contract) {
      this.init();
    }
    return this.contract;
  }

  /**
   * Create an exam on the blockchain
   */
  async createExam(examCode, examPaperHash, startUnix, endUnix, durationMinutes) {
    await this.ensureContract();

    if (!this.contract || !this.wallet) {
      console.warn(`[BlockchainService] Simulating createExam for ${examCode}`);
      return {
        txHash: `0x${ethers.hexlify(ethers.randomBytes(32)).slice(2)}`,
        blockNumber: 1849,
        simulated: true,
      };
    }

    try {
      const tx = await this.contract.createExam(
        examCode,
        examPaperHash,
        BigInt(startUnix),
        BigInt(endUnix),
        BigInt(durationMinutes)
      );
      const receipt = await tx.wait(1);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        simulated: false,
      };
    } catch (error) {
      console.error(`[BlockchainService] createExam failed for ${examCode}:`, error.message);
      // Fallback for demo environments where network is simulated
      return {
        txHash: `0x${ethers.hexlify(ethers.randomBytes(32)).slice(2)}`,
        blockNumber: 1849,
        simulated: true,
        error: error.message,
      };
    }
  }

  /**
   * Authorize a batch of student wallets on the blockchain
   */
  async authorizeStudents(examCode, studentWallets) {
    await this.ensureContract();

    if (!this.contract || !this.wallet) {
      console.warn(`[BlockchainService] Simulating authorizeStudents for ${examCode}`);
      return {
        txHash: `0x${ethers.hexlify(ethers.randomBytes(32)).slice(2)}`,
        simulated: true,
      };
    }

    try {
      const tx = await this.contract.authorizeStudents(examCode, studentWallets);
      const receipt = await tx.wait(1);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        simulated: false,
      };
    } catch (error) {
      console.error(`[BlockchainService] authorizeStudents failed:`, error.message);
      return {
        txHash: `0x${ethers.hexlify(ethers.randomBytes(32)).slice(2)}`,
        simulated: true,
        error: error.message,
      };
    }
  }

  /**
   * Check if an exam is currently active on-chain
   */
  async isExamActive(examCode) {
    await this.ensureContract();

    if (!this.contract) {
      return false;
    }

    try {
      return await this.contract.isExamActive(examCode);
    } catch (error) {
      console.warn(`[BlockchainService] isExamActive failed for ${examCode}, checking local status:`, error.message);
      return false;
    }
  }

  /**
   * Validate if a student can access the exam on-chain
   */
  async checkStudentAccess(examCode, studentWallet) {
    await this.ensureContract();

    if (!this.contract) {
      return { canAccess: true, reason: 'Simulation mode: Access permitted' };
    }

    try {
      const [canAccess, reason] = await this.contract.checkStudentAccess(examCode, studentWallet);
      return { canAccess, reason };
    } catch (error) {
      console.warn(`[BlockchainService] checkStudentAccess call error:`, error.message);
      return { canAccess: true, reason: 'Access granted (offline/dev fallback)' };
    }
  }

  /**
   * Record a student's submission hash on the blockchain
   */
  async recordSubmission(examCode, studentWallet, submissionHash) {
    await this.ensureContract();

    // Ensure 0x prefix for 32-byte hash
    const formattedHash = submissionHash.startsWith('0x') ? submissionHash : `0x${submissionHash}`;

    if (!this.contract || !this.wallet) {
      console.warn(`[BlockchainService] Simulating recordSubmission for ${examCode}`);
      return {
        txHash: `0x${ethers.hexlify(ethers.randomBytes(32)).slice(2)}`,
        blockNumber: 1850,
        simulated: true,
      };
    }

    try {
      const tx = await this.contract.recordSubmission(examCode, studentWallet, formattedHash);
      const receipt = await tx.wait(1);
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        simulated: false,
      };
    } catch (error) {
      console.error(`[BlockchainService] recordSubmission error:`, error.message);
      return {
        txHash: `0x${ethers.hexlify(ethers.randomBytes(32)).slice(2)}`,
        blockNumber: 1850,
        simulated: true,
        error: error.message,
      };
    }
  }

  /**
   * Verify submission hash against the on-chain ledger
   */
  async verifySubmissionHash(examCode, studentWallet, calculatedHash) {
    await this.ensureContract();

    const formattedHash = calculatedHash.startsWith('0x') ? calculatedHash : `0x${calculatedHash}`;

    if (!this.contract) {
      return true;
    }

    try {
      return await this.contract.verifySubmissionHash(examCode, studentWallet, formattedHash);
    } catch (error) {
      console.warn(`[BlockchainService] verifySubmissionHash call error:`, error.message);
      return false;
    }
  }

  /**
   * Fetch the on-chain submission record
   */
  async getSubmissionRecord(examCode, studentWallet) {
    await this.ensureContract();

    if (!this.contract) {
      return null;
    }

    try {
      const record = await this.contract.submissions(examCode, studentWallet);
      return {
        submissionHash: record.submissionHash,
        submittedAt: Number(record.submittedAt),
        isSubmitted: record.isSubmitted,
      };
    } catch (error) {
      console.warn(`[BlockchainService] getSubmissionRecord call error:`, error.message);
      return null;
    }
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;
