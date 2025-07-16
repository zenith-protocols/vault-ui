'use client';

import { VaultState, VaultRedeem } from '@zenith-protocols/vault-sdk';
import { VaultStateDisplay } from '@/components/vault/vault-state';
import { VaultActions } from '@/components/vault/vault-actions';
import { VaultRedeemDisplay } from '@/components/vault/vault-redeem';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletStore } from '@/stores/wallet-store';

interface VaultDashboardProps {
    vaultAddress: string;
    vaultState: VaultState;
    userRedemption: VaultRedeem | null;
    onTransactionComplete?: () => void;
    isLoading?: boolean;
}

export function VaultDashboard({
    vaultAddress,
    vaultState,
    userRedemption,
    onTransactionComplete,
    isLoading = false
}: VaultDashboardProps) {
    const { walletAddress } = useWalletStore();

    if (isLoading) {
        return (
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <Skeleton className="h-[400px]" />
                </Card>
                <Card className="p-6">
                    <Skeleton className="h-[400px]" />
                </Card>
            </div>
        );
    }

    if (!vaultState) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Unable to load vault data. Please check the address and try again.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Main grid layout */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Vault State - Left Side */}
                <VaultStateDisplay vaultAddress={vaultAddress} vaultState={vaultState} />

                {/* Vault Actions - Right Side */}
                <VaultActions
                    vaultAddress={vaultAddress}
                    vaultState={vaultState}
                    onTransactionComplete={onTransactionComplete}
                />
            </div>

            {/* Redemption management - full width below */}
            {walletAddress && (
                <VaultRedeemDisplay
                    vaultAddress={vaultAddress}
                    vaultState={vaultState}
                    userRedemption={userRedemption}
                    onTransactionComplete={onTransactionComplete}
                />
            )}
        </div>
    );
}