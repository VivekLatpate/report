import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';

export interface PhantomWallet {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  isPhantom: boolean;
}

export interface CrimeReportTransaction {
  signature: string;
  explorerUrl: string;
  success: boolean;
  error?: string;
}

export class PhantomWalletService {
  private connection: Connection;
  private phantomWallet: PhantomWallet | null = null;

  constructor() {
    // Use devnet for development
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  }

  // Initialize Phantom wallet connection
  async initializePhantom(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const phantom = (window as any).solana;
    if (phantom && phantom.isPhantom) {
      this.phantomWallet = phantom;
      return true;
    }
    return false;
  }

  // Connect to Phantom wallet
  async connectWallet(): Promise<{ publicKey: PublicKey; address: string }> {
    if (!this.phantomWallet) {
      throw new Error('Phantom wallet not found. Please install Phantom wallet extension.');
    }

    try {
      const response = await this.phantomWallet.connect();
      return {
        publicKey: response.publicKey,
        address: response.publicKey.toString()
      };
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the connection request. Please try again and approve the connection.');
      } else if (error.code === -32002) {
        throw new Error('Connection request already pending. Please check your Phantom wallet.');
      } else {
        throw new Error(`Failed to connect to Phantom wallet: ${error.message || 'Unknown error'}`);
      }
    }
  }

  // Get wallet balance
  async getBalance(address: string): Promise<number> {
    try {
      // Validate address format first
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid Solana address format');
      }
      
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  // Validate Solana address format
  private isValidAddress(address: string): boolean {
    try {
      // Check length (Solana addresses are typically 32-44 characters)
      if (address.length < 32 || address.length > 44) {
        return false;
      }
      
      // Check if it's valid base58
      if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
        return false;
      }
      
      // Try to create PublicKey to validate
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // Create and sign crime report transaction
  async createCrimeReportTransaction(
    userWalletAddress: string,
    reportData: {
      location: string;
      description: string;
      category: string;
      priority: string;
      timestamp: string;
    }
  ): Promise<CrimeReportTransaction> {
    try {
      if (!this.phantomWallet) {
        throw new Error('Phantom wallet not connected');
      }

      // Validate address format
      if (!this.isValidAddress(userWalletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const userPublicKey = new PublicKey(userWalletAddress);
      
      // Create a transaction that stores crime report data on-chain
      const transaction = new Transaction();
      
      // Add memo instruction with crime report data
      // This creates a permanent record on the Solana blockchain
      const memoData = JSON.stringify({
        type: 'CRIME_REPORT',
        version: '1.0',
        data: {
          location: reportData.location,
          description: reportData.description,
          category: reportData.category,
          priority: reportData.priority,
          timestamp: reportData.timestamp,
          reporter: userWalletAddress
        }
      });

      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
        data: Buffer.from(memoData)
      });
      
      transaction.add(memoInstruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;
      
      // Sign the transaction with Phantom wallet
      const signedTransaction = await this.phantomWallet.signTransaction(transaction);
      
      // Send the transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      
      console.log('🚀 Crime Report Transaction completed successfully!', {
        signature,
        explorerUrl,
        userAddress: userWalletAddress,
        reportData
      });
      
      return {
        signature,
        explorerUrl,
        success: true
      };
      
    } catch (error: any) {
      console.error('Error creating crime report transaction:', error);
      
      // Handle specific Phantom wallet errors
      if (error.code === 4001) {
        return {
          signature: '',
          explorerUrl: '',
          success: false,
          error: 'User rejected the transaction. Please try again and approve the transaction.'
        };
      } else if (error.code === -32002) {
        return {
          signature: '',
          explorerUrl: '',
          success: false,
          error: 'Transaction request already pending. Please check your Phantom wallet.'
        };
      }
      
      return {
        signature: '',
        explorerUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send SOL payment for crime report submission
  async sendCrimeReportPayment(
    userWalletAddress: string,
    amount: number = 0.01 // Small fee for report submission
  ): Promise<CrimeReportTransaction> {
    try {
      if (!this.phantomWallet) {
        throw new Error('Phantom wallet not connected');
      }

      // Validate address format
      if (!this.isValidAddress(userWalletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const userPublicKey = new PublicKey(userWalletAddress);
      
      // Create payment transaction
      const transaction = new Transaction();
      
      // Add transfer instruction (user pays a small fee)
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: new PublicKey('11111111111111111111111111111112'), // System program as recipient
        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
      });
      
      transaction.add(transferInstruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;
      
      // Sign the transaction with Phantom wallet
      const signedTransaction = await this.phantomWallet.signTransaction(transaction);
      
      // Send the transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      
      return {
        signature,
        explorerUrl,
        success: true
      };
      
    } catch (error) {
      console.error('Error sending crime report payment:', error);
      return {
        signature: '',
        explorerUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Disconnect wallet
  async disconnectWallet(): Promise<void> {
    if (this.phantomWallet) {
      try {
        await this.phantomWallet.disconnect();
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
  }
}
