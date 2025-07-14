'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { VaultDashboard } from '@/components/vault-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletStore } from '@/stores/wallet-store';
import { Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { VaultContract } from '@zenith-protocols/vault-sdk';
import {
  Contract,
  SorobanRpc,
  scValToNative,
  xdr,
  Address
} from '@stellar/stellar-sdk';

// Define the VaultData type based on what the components expect
interface VaultData {
  // Core vault info
  shareToken: string;
  totalShares: string;
  totalTokens: string;
  minLiquidityRate: number;
  redemptionDelay: number;
  maxPenaltyRate: number;

  // Token info
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;

  // Share token info
  shareSymbol: string;
  shareName: string;

  // Calculated values
  sharePrice: number;
  totalValueLocked: string;
  availableLiquidity: string;

  // User specific (if wallet connected)
  userShareBalance?: string;
  userTokenBalance?: string;
  userRedemption?: {
    shares: string;
    unlockTime: number;
  };

  // Strategies
  strategies: Array<{
    address: string;
    borrowed: string;
    netImpact: string;
  }>;
}

// Helper to convert ScVal to native value
const parseScVal = (val: xdr.ScVal): any => {
  try {
    return scValToNative(val);
  } catch (e) {
    console.error('Error parsing ScVal:', e);
    return null;
  }
};

// Load vault data using the SDK
async function loadVaultData(
  network: { rpc: string; passphrase: string },
  vaultAddress: string,
  userAddress?: string
): Promise<VaultData | null> {
  try {
    const server = new SorobanRpc.Server(network.rpc);
    const vaultContract = new VaultContract(vaultAddress);

    // Create a generic contract instance for read operations
    const contract = new Contract(vaultAddress);

    // Prepare all read operations
    const operations = [
      vaultContract.token(),
      vaultContract.shareToken(),
      vaultContract.totalShares(),
      vaultContract.totalTokens(),
    ];

    // Simulate all operations in parallel
    const results = await Promise.all(
      operations.map(async (op) => {
        try {
          const tx = new SorobanRpc.TransactionBuilder(
            new SorobanRpc.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
            {
              fee: '100',
              networkPassphrase: network.passphrase,
            }
          )
            .addOperation(xdr.Operation.fromXDR(op, 'base64'))
            .setTimeout(30)
            .build();

          const response = await server.simulateTransaction(tx);

          if ('result' in response && response.result?.retval) {
            return parseScVal(response.result.retval);
          }
          return null;
        } catch (e) {
          console.error('Simulation error:', e);
          return null;
        }
      })
    );

    const [tokenAddress, shareToken, totalShares, totalTokens] = results;

    if (!tokenAddress || !shareToken) {
      throw new Error('Failed to load vault core data');
    }

    // For now, use default values for some fields
    // In a real implementation, you'd load these from the contract
    const minLiquidityRate = 0.2; // 20%
    const redemptionDelay = 86400; // 24 hours in seconds
    const maxPenaltyRate = 0.1; // 10%

    // Calculate share price
    const sharePrice = totalShares && totalTokens && Number(totalShares) > 0
      ? Number(totalTokens) / Number(totalShares)
      : 1;

    // Create base vault data
    const vaultData: VaultData = {
      shareToken: shareToken as string,
      totalShares: totalShares?.toString() || '0',
      totalTokens: totalTokens?.toString() || '0',
      minLiquidityRate,
      redemptionDelay,
      maxPenaltyRate,

      tokenAddress: tokenAddress as string,
      tokenSymbol: 'TOKEN', // TODO: Load from token contract
      tokenDecimals: 7, // Stellar default

      shareSymbol: 'vTOKEN', // TODO: Load from share token contract
      shareName: 'Vault Token', // TODO: Load from share token contract

      sharePrice,
      totalValueLocked: totalTokens?.toString() || '0',
      availableLiquidity: totalTokens?.toString() || '0', // TODO: Calculate properly

      strategies: [], // TODO: Load strategies
    };

    // Load user-specific data if wallet is connected
    if (userAddress) {
      try {
        // Load user's share balance
        const shareTokenContract = new Contract(shareToken as string);
        const balanceOp = shareTokenContract.call(
          'balance',
          ...(Contract.spec.funcArgsToScVals('balance', { id: Address.fromString(userAddress) }) as any)
        );

        const balanceTx = new SorobanRpc.TransactionBuilder(
          new SorobanRpc.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
          {
            fee: '100',
            networkPassphrase: network.passphrase,
          }
        )
          .addOperation(xdr.Operation.fromXDR(balanceOp.toXDR('base64'), 'base64'))
          .setTimeout(30)
          .build();

        const balanceResponse = await server.simulateTransaction(balanceTx);

        if ('result' in balanceResponse && balanceResponse.result?.retval) {
          const balance = parseScVal(balanceResponse.result.retval);
          vaultData.userShareBalance = balance?.toString() || '0';
        }

        // TODO: Load user's token balance
        // TODO: Load user's redemption request if any
      } catch (e) {
        console.error('Error loading user data:', e);
      }
    }

    return vaultData;
  } catch (error) {
    console.error('Error loading vault data:', error);
    return null;
  }
}

export default function VaultApp() {
  // Change: Now we get the whole context and access properties directly
  const { walletAddress, network } = useWalletStore();

  const [vaultAddress, setVaultAddress] = useState('');
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load vault data
  const loadVault = async (address?: string) => {
    const addressToLoad = address || vaultAddress;
    if (!addressToLoad) return;

    setLoading(true);
    setError(null);

    try {
      const data = await loadVaultData(
        network,
        addressToLoad,
        walletAddress || undefined
      );

      if (data) {
        setVaultData(data);
        toast.success('Vault loaded successfully');
      } else {
        setError('Failed to load vault. Please check the address.');
        setVaultData(null);
      }
    } catch (err) {
      console.error('Error loading vault:', err);
      setError('Invalid vault address or network error');
      setVaultData(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data (called after transactions)
  const refreshData = () => {
    if (vaultData && vaultAddress) {
      loadVault(vaultAddress);
    }
  };

  // Reload when wallet changes
  useEffect(() => {
    if (vaultData && vaultAddress) {
      loadVault(vaultAddress);
    }
  }, [walletAddress]);

  // Optional: Auto-refresh every 30 seconds
  useEffect(() => {
    if (!vaultData || !vaultAddress) return;

    const interval = setInterval(() => {
      loadVault(vaultAddress);
    }, 30000);

    return () => clearInterval(interval);
  }, [vaultData, vaultAddress]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {!vaultData ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Load Vault</CardTitle>
              <CardDescription>
                Enter a vault contract address to view and manage your position
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter vault contract address..."
                  value={vaultAddress}
                  onChange={(e) => setVaultAddress(e.target.value)}
                  disabled={loading}
                />
                <Button
                  onClick={() => loadVault()}
                  disabled={loading || !vaultAddress}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Load Vault
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Vault Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{vaultData.shareName}</h2>
                <p className="text-muted-foreground font-mono text-sm">
                  {vaultAddress}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVaultData(null);
                    setVaultAddress('');
                  }}
                >
                  Change Vault
                </Button>
              </div>
            </div>

            {/* Vault Dashboard */}
            <VaultDashboard
              vaultAddress={vaultAddress}
              vaultData={vaultData}
              onTransactionComplete={refreshData}
            />
          </div>
        )}
      </main>
    </div>
  );
}