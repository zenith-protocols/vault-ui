// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { VaultDashboard } from '@/components/vault-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletStore } from '@/stores/wallet-store';
import { loadVaultData, type VaultData } from '@/lib/vault';
import { Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function VaultApp() {
  const walletAddress = useWalletStore(state => state.walletAddress);
  const network = useWalletStore(state => state.network);

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
          // Vault selection screen
          <div className="mx-auto max-w-2xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Load Vault</CardTitle>
                <CardDescription>
                  Enter a vault contract address to view and interact with it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
                    value={vaultAddress}
                    onChange={(e) => setVaultAddress(e.target.value)}
                    className="font-mono text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading) {
                        loadVault();
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    onClick={() => loadVault()}
                    disabled={loading || !vaultAddress}
                    className="shrink-0"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Load
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

            {/* Optional: Recent vaults or quick actions could go here */}
          </div>
        ) : (
          // Vault dashboard
          <>
            {/* Vault header with refresh button */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Vault Dashboard</h1>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVaultData(null);
                    setVaultAddress('');
                    setError(null);
                  }}
                >
                  Change Vault
                </Button>
              </div>
            </div>

            <VaultDashboard
              vaultAddress={vaultAddress}
              vaultData={vaultData}
              onTransactionComplete={refreshData}
              isLoading={loading}
            />
          </>
        )}
      </main>
    </div>
  );
}