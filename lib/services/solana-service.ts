import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface SolanaReward {
  amount: number; // in SOL
  recipient: string; // wallet address
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
}

export class SolanaService {
  private connection: Connection;
  private rewardWallet: PublicKey;
  private rewardWalletPrivateKey: string;

  constructor() {
    // Use devnet for development
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // For development, we'll use a mock wallet
    // In production, this should be a secure server-side wallet
    this.rewardWallet = new PublicKey('11111111111111111111111111111112'); // System program ID as placeholder
    this.rewardWalletPrivateKey = process.env.SOLANA_PRIVATE_KEY || '';
  }

  // Generate a fixed reward amount of 0.6 SOL
  generateRewardAmount(): number {
    return 0.6; // Fixed 0.6 SOL reward
  }

  // Validate if a wallet address is valid
  isValidWalletAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // Check wallet balance
  async getWalletBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  // Send SOL reward (mock implementation for development)
  async sendReward(recipientAddress: string, amount: number): Promise<SolanaReward> {
    try {
      // For development, we'll simulate the transaction
      // In production, you would implement actual SOL transfer
      
      const recipient = new PublicKey(recipientAddress);
      
      // Mock transaction ID
      const transactionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Mock SOL Transfer: ${amount} SOL to ${recipientAddress}`);
      console.log(`Transaction ID: ${transactionId}`);
      
      return {
        amount,
        recipient: recipientAddress,
        transactionId,
        status: 'completed'
      };
    } catch (error) {
      console.error('Error sending SOL reward:', error);
      return {
        amount,
        recipient: recipientAddress,
        status: 'failed'
      };
    }
  }

  // Get recent transactions for a wallet
  async getRecentTransactions(address: string, limit: number = 10): Promise<any[]> {
    try {
      const publicKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      return signatures;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  // Check if wallet is connected to devnet
  async isConnectedToDevnet(address: string): Promise<boolean> {
    try {
      const publicKey = new PublicKey(address);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      return accountInfo !== null;
    } catch (error) {
      console.error('Error checking devnet connection:', error);
      return false;
    }
  }
}
