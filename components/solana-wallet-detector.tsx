"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wallet, Coins, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { PhantomWalletService } from '@/lib/services/phantom-wallet-service';

interface WalletInfo {
  address: string;
  balance: number;
  isValid: boolean;
  isConnected: boolean;
}

interface SolanaWalletDetectorProps {
  onWalletDetected: (wallet: WalletInfo) => void;
  onWalletCleared: () => void;
}

export function SolanaWalletDetector({ onWalletDetected, onWalletCleared }: SolanaWalletDetectorProps) {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [phantomService] = useState(() => new PhantomWalletService());

  useEffect(() => {
    // Initialize Phantom wallet service
    phantomService.initializePhantom();
  }, [phantomService]);

  const connectPhantomWallet = async () => {
    try {
      setIsDetecting(true);
      setError(null);

      const { publicKey, address } = await phantomService.connectWallet();
      
      // Get actual balance from Solana network
      const balance = await phantomService.getBalance(address);
      
      const walletInfo: WalletInfo = {
        address,
        balance,
        isValid: true,
        isConnected: true
      };
      
      setWalletInfo(walletInfo);
      onWalletDetected(walletInfo);
      console.log('Phantom wallet connected:', walletInfo);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Phantom wallet');
    } finally {
      setIsDetecting(false);
    }
  };

  const detectManualWallet = async () => {
    setError(null);
    setIsDetecting(true);
    try {
      const address = walletAddress.trim();
      if (!address) {
        setError('Please enter a Solana wallet address');
        return;
      }

      // Validate address format
      try {
        // Simple validation - check if it's a valid base58 string with correct length
        if (address.length < 32 || address.length > 44) {
          throw new Error('Invalid length');
        }
        // Basic base58 character check
        if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
          throw new Error('Invalid characters');
        }
      } catch {
        setError('Invalid Solana wallet address format');
        return;
      }

      // Get actual balance from Solana network
      const balance = await phantomService.getBalance(address);

      const walletInfo: WalletInfo = {
        address,
        balance,
        isValid: true,
        isConnected: false // Manual entry, not connected via Phantom
      };

      setWalletInfo(walletInfo);
      onWalletDetected(walletInfo);
      console.log('Manual wallet detected:', walletInfo);
    } catch (err: any) {
      setError(err.message || 'Failed to detect wallet');
    } finally {
      setIsDetecting(false);
    }
  };

  const clearWallet = () => {
    setWalletAddress('');
    setWalletInfo(null);
    setError(null);
    phantomService.disconnectWallet();
    onWalletCleared();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-500" />
          Solana Wallet Connection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!walletInfo ? (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <Wallet className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <strong>Required:</strong> Connect your Phantom wallet to submit crime reports. 
                You'll sign a transaction that stores your report data on the Solana blockchain.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={connectPhantomWallet}
              disabled={isDetecting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isDetecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="mr-2 h-4 w-4" />
              )}
              Connect Phantom Wallet
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter Solana Wallet Address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="flex-grow"
                disabled={isDetecting}
              />
              <Button onClick={detectManualWallet} disabled={isDetecting}>
                {isDetecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Transaction Information</span>
              </div>
              <p className="text-xs text-blue-700">
                • Your crime report will be stored on Solana blockchain<br/>
                • You'll sign the transaction with your wallet<br/>
                • Receive 0.6 SOL reward when verified by admin<br/>
                • All transactions visible on Solana Explorer
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Wallet connected successfully!
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Network:</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Solana Devnet
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Address:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {walletInfo.address.slice(0, 8)}...{walletInfo.address.slice(-8)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`https://explorer.solana.com/address/${walletInfo.address}?cluster=devnet`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Balance:</span>
                <div className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-yellow-600" />
                  <span className="text-sm font-medium">{walletInfo.balance.toFixed(4)} SOL</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={walletInfo.isConnected ? "default" : "secondary"}>
                  {walletInfo.isConnected ? "Connected" : "Manual Entry"}
                </Badge>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Ready for Transaction</span>
              </div>
              <p className="text-xs text-blue-700">
                Your wallet is ready to sign transactions. When you submit a crime report,
                you'll sign a transaction that stores your report data on the Solana blockchain.
              </p>
            </div>

            <Button
              onClick={clearWallet}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Disconnect Wallet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}