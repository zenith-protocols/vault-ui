'use client';

import { VaultState } from '@/components/vault/vault-state';
import { VaultActions } from '@/components/vault/vault-actions';
import { VaultRedeem } from '@/components/vault/vault-redeem';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VaultDashboardProps {
    vaultAddress: string;
    vaultData: any; // You can type this properly based on your VaultData type
    onTransactionComplete?: () => void;
    isLoading?: boolean;
}

export function VaultDashboard({
    vaultAddress,
    vaultData,
    onTransactionComplete,
    isLoading = false
}: VaultDashboardProps) {
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

    if (!vaultData) {
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
                <VaultState vaultAddress={vaultAddress} vaultData={vaultData} />

                {/* Vault Actions - Right Side */}
                <VaultActions
                    vaultAddress={vaultAddress}
                    vaultData={vaultData}
                    onTransactionComplete={onTransactionComplete}
                />
            </div>

            {/* Redemption management - full width below */}
            <VaultRedeem
                vaultAddress={vaultAddress}
                vaultData={vaultData}
                onTransactionComplete={onTransactionComplete}
            />
        </div>
    );
}