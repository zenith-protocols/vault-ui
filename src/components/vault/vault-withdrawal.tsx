'use client';

import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWallet, useTransaction, useNetwork } from '@/hooks/use-wallet';
import { useContracts } from '@/hooks/use-contracts';
import { useVaultState, useVaultWithdrawal } from '@/hooks/use-vault';
import { useQueryClient } from '@tanstack/react-query';
import { VaultContract } from '@zenith-protocols/zenex-sdk';
import { Clock, CheckCircle, X, Loader2 } from 'lucide-react';

export function VaultWithdrawal() {
    const { walletAddress } = useWallet();
    const { submitTransaction, isTransacting } = useTransaction();
    const { network } = useNetwork();
    const contracts = useContracts();
    const queryClient = useQueryClient();

    // Get data
    const { data: vaultState } = useVaultState(network, contracts.vault, contracts.token);
    const { data: withdrawal, refetch: refetchWithdrawal } = useVaultWithdrawal(
        network,
        contracts.vault,
        walletAddress || ''
    );

    // Calculate if withdrawal is unlocked
    const currentTime = Math.floor(Date.now() / 1000);
    const isWithdrawalUnlocked = withdrawal && withdrawal.unlockTime <= currentTime;
    const timeUntilUnlock = withdrawal ? Math.max(0, withdrawal.unlockTime - currentTime) : 0;

    // Format time remaining
    const formatTimeRemaining = (seconds: number) => {
        if (seconds <= 0) return 'Ready';
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes}m`;
    };

    // Calculate withdrawal value
    const withdrawalValue = useMemo(() => {
        if (!withdrawal || !vaultState) return '0';

        const sharePrice = vaultState.totalShares > 0
            ? vaultState.balance / vaultState.totalShares
            : 1;

        return (withdrawal.shares * sharePrice).toFixed(2);
    }, [withdrawal, vaultState]);

    // Handle execute withdrawal
    const handleExecuteWithdraw = async () => {
        if (!walletAddress || !withdrawal || !isWithdrawalUnlocked) return;

        try {
            const vaultContract = new VaultContract(contracts.vault);
            const operationXdr = vaultContract.withdraw(walletAddress);

            const result = await submitTransaction(operationXdr);

            if (result.success) {
                refetchWithdrawal();
                queryClient.invalidateQueries({ queryKey: ['vault'] });
                queryClient.invalidateQueries({ queryKey: ['token-balance'] });
            }
        } catch (error) {
            console.error('Execute withdrawal failed:', error);
        }
    };

    // Handle cancel withdrawal
    const handleCancelWithdraw = async () => {
        if (!walletAddress || !withdrawal) return;

        try {
            const vaultContract = new VaultContract(contracts.vault);
            const operationXdr = vaultContract.cancelWithdraw(walletAddress);

            const result = await submitTransaction(operationXdr);

            if (result.success) {
                refetchWithdrawal();
                queryClient.invalidateQueries({ queryKey: ['token-balance'] });
            }
        } catch (error) {
            console.error('Cancel withdrawal failed:', error);
        }
    };

    if (!withdrawal) return null;

    return (
        <div className="mb-4 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            <div className="flex items-center justify-between">
                {/* Left column - 3 rows */}
                <div className="flex flex-col space-y-1">
                    <h4 className="font-medium">Pending Withdrawal</h4>
                    <p className="text-sm text-muted-foreground">
                        {withdrawal.shares} shares (~{withdrawalValue} tokens)
                    </p>
                    <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {isWithdrawalUnlocked ? (
                            <span className="text-green-600 font-medium">Ready to withdraw</span>
                        ) : (
                            <span className="text-muted-foreground">
                                Unlocks in {formatTimeRemaining(timeUntilUnlock)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right column - button */}
                <div>
                    {isWithdrawalUnlocked ? (
                        <Button
                            size="sm"
                            onClick={handleExecuteWithdraw}
                            disabled={isTransacting}
                        >
                            {isTransacting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Withdraw
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleCancelWithdraw}
                            disabled={isTransacting}
                        >
                            {isTransacting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}