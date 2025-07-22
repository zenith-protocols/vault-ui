'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { VaultDashboard } from '@/components/vault-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletStore } from '@/stores/wallet-store';
import { Search, Loader2, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { VaultState, VaultRedeem } from '@zenith-protocols/vault-sdk';
import { DeployModal } from '@/components/deploy-modal';

export default function Home() {
  const { walletAddress, network } = useWalletStore();
  const [vaultAddress, setVaultAddress] = useState('');
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [userRedemption, setUserRedemption] = useState<VaultRedeem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deployModalOpen, setDeployModalOpen] = useState(false);

  const loadVault = async () => {
    if (!vaultAddress || !network) {
      setError('Please enter a vault address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const state = await VaultState.load(network, vaultAddress);
      setVaultState(state);

      // Load user redemption if wallet connected
      if (walletAddress) {
        await loadUserRedemption();
      }

      toast.success('Vault loaded successfully');
    } catch (err) {
      console.error('Failed to load vault:', err);
      setError('Failed to load vault. Please check the address and try again.');
      toast.error('Failed to load vault');
    } finally {
      setIsLoading(false);
    }
  };

  // Load user redemption data
  const loadUserRedemption = useCallback(async () => {
    if (!walletAddress || !vaultAddress || !network) return;

    try {
      const redemption = await VaultRedeem.load(network, vaultAddress, walletAddress);
      setUserRedemption(redemption);
    } catch (err) {
      console.error('Failed to load user redemption:', err);
      // User may not have a redemption
      setUserRedemption(null);
    }
  }, [walletAddress, vaultAddress, network]);

  const refreshData = () => {
    if (vaultState) {
      loadVault();
    }
  };

  // Auto-load redemption when wallet connects
  useEffect(() => {
    if (walletAddress && vaultState) {
      loadUserRedemption();
    }
  }, [walletAddress, vaultState, loadUserRedemption]);

  // Callback for when a new vault is deployed
  const handleVaultDeployed = async (newVaultAddress: string) => {
    setVaultAddress(newVaultAddress);
    setDeployModalOpen(false);
    setVaultState(null); // Reset state to trigger loading UI
    setUserRedemption(null);
    await loadVault();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DeployModal
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        onVaultDeployed={handleVaultDeployed}
      />
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {!vaultState ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Load Vault</CardTitle>
              <CardDescription>
                Enter a vault address to view and interact with it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Vault address (e.g., CA...)"
                  value={vaultAddress}
                  onChange={(e) => setVaultAddress(e.target.value)}
                  disabled={isLoading}
                />
                <Button onClick={loadVault} disabled={isLoading || !vaultAddress}>
                  {isLoading ? (
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
                <Button
                  variant="outline"
                  onClick={() => setDeployModalOpen(true)}
                  disabled={isLoading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Deploy Vault
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Vault</h2>
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
                    setVaultState(null);
                    setUserRedemption(null);
                    setVaultAddress('');
                  }}
                >
                  Change Vault
                </Button>
              </div>
            </div>

            <VaultDashboard
              vaultAddress={vaultAddress}
              vaultState={vaultState}
              userRedemption={userRedemption}
              onTransactionComplete={refreshData}
            />
          </div>
        )}
      </main>
    </div>
  );
}