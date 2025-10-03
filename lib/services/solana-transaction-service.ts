import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';

export interface TransactionResult {
  signature: string;
  explorerUrl: string;
  success: boolean;
  error?: string;
}

export class SolanaTransactionService {
  private connection: Connection;
  private rewardWallet: Keypair;

  constructor() {
    // Use devnet for development
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Generate a keypair for the reward wallet (in production, use secure key management)
    this.rewardWallet = Keypair.generate();
  }

  // Create and sign a transaction for crime report submission
  async createCrimeReportTransaction(
    userWalletAddress: string,
    reportData: {
      location: string;
      description: string;
      category: string;
      priority: string;
    }
  ): Promise<TransactionResult> {
    try {
      const userPublicKey = new PublicKey(userWalletAddress);
      
      // Create a transaction that includes report metadata
      const transaction = new Transaction();
      
      // Add a memo instruction with report data (this creates a permanent record on-chain)
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
        data: Buffer.from(JSON.stringify({
          type: 'CRIME_REPORT',
          location: reportData.location,
          description: reportData.description,
          category: reportData.category,
          priority: reportData.priority,
          timestamp: new Date().toISOString()
        }))
      });
      
      transaction.add(memoInstruction);
      
      // Sign the transaction with the reward wallet (simulating the system signing)
      transaction.sign(this.rewardWallet);
      
      // Send the transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.rewardWallet],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );
      
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      
      return {
        signature,
        explorerUrl,
        success: true
      };
      
    } catch (error) {
      console.error('Error creating crime report transaction:', error);
      return {
        signature: '',
        explorerUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send SOL reward transaction
  async sendRewardTransaction(
    recipientAddress: string,
    amount: number
  ): Promise<TransactionResult> {
    try {
      const recipient = new PublicKey(recipientAddress);
      
      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: this.rewardWallet.publicKey,
        toPubkey: recipient,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
      });
      
      const transaction = new Transaction().add(transferInstruction);
      
      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.rewardWallet],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed'
        }
      );
      
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      
      return {
        signature,
        explorerUrl,
        success: true
      };
      
    } catch (error) {
      console.error('Error sending reward transaction:', error);
      return {
        signature: '',
        explorerUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get transaction details from Solana Explorer
  getTransactionExplorerUrl(signature: string): string {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }

  // Check if wallet has enough balance for transaction fees
  async checkWalletBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      return 0;
    }
  }
}


