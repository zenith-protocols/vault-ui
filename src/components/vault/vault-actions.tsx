'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWallet, useTransaction, useNetwork } from '@/hooks/use-wallet';
import { useVaultState, useVaultWithdrawal } from '@/hooks/use-vault';
import { useTokenBalance } from '@/hooks/use-token';
import { useQueryClient } from '@tanstack/react-query';
import { VaultContract } from '@zenith-protocols/zenex-sdk';
import { VaultWithdrawal } from './vault-withdrawal';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    AlertCircle,
    Loader2,
    Info
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import type { SimulationResult } from '@/lib/stellar';

type ActionType = 'deposit' | 'withdraw';

export function VaultActions() {
    const { connected, walletAddress } = useWallet();
    const { submitTransaction, isTransacting, simulateTransaction } = useTransaction();
    const { network } = useNetwork();
    const contracts = useContracts();
    const queryClient = useQueryClient();

    // State
    const [actionType, setActionType] = useState<ActionType>('deposit');
    const [amount, setAmount] = useState('');
    const [simulation, setSimulation] = useState<SimulationResult | null>(null);
    const [simulating, setSimulating] = useState(false);

    // Get data
    const { data: vaultState } = useVaultState(network, contracts.vault, contracts.token);
    const { data: withdrawal, refetch: refetchWithdrawal } = useVaultWithdrawal(
        network,
        contracts.vault,
        walletAddress || ''
    );

    // Get user's token balance
    const { data: tokenData } = useTokenBalance(
        network,
        contracts.token,
        walletAddress || '',
        7
    );

    // Get user's vault shares balance
    const { data: sharesData } = useTokenBalance(
        network,
        vaultState?.shareToken || '',
        walletAddress || '',
        7
    );

    const tokenBalance = tokenData?.balance;
    const sharesBalance = sharesData?.balance;

    // Calculate share price
    const sharePrice = useMemo(() => {
        if (!vaultState) return 1;
        return vaultState.totalShares > 0
            ? vaultState.balance / vaultState.totalShares
            : 1;
    }, [vaultState]);

    // Calculate estimated output (works even without wallet connected)
    const estimatedOutput = useMemo(() => {
        if (!amount || !vaultState) return { value: '0', label: '' };

        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) return { value: '0', label: '' };

        if (actionType === 'deposit') {
            // Depositing tokens, get shares
            const shares = sharePrice > 0 ? inputAmount / sharePrice : inputAmount;
            return { value: shares.toFixed(4), label: 'shares' };
        } else {
            // Withdrawing shares, get tokens
            const tokens = inputAmount * sharePrice;
            return { value: tokens.toFixed(2), label: 'tokens' };
        }
    }, [amount, actionType, sharePrice, vaultState]);

    // Get balance for current action type
    const currentBalance = actionType === 'deposit' ? tokenBalance : sharesBalance;
    const balanceLabel = actionType === 'deposit' ? 'tokens' : 'shares';

    // Validation
    const actionError = useMemo(() => {
        if (!connected) return `Connect wallet to ${actionType}`;
        if (withdrawal && actionType === 'withdraw') return 'You already have a pending withdrawal';
        if (!amount) return null;

        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) return 'Enter a valid amount';

        if (currentBalance && inputAmount > parseFloat(currentBalance)) {
            return `Insufficient ${balanceLabel}`;
        }

        if (actionType === 'deposit' && inputAmount < 1) return 'Minimum deposit is 1 token';
        if (actionType === 'withdraw' && inputAmount < 0.01) return 'Minimum withdrawal is 0.01 shares';

        return null;
    }, [connected, amount, currentBalance, actionType, withdrawal, balanceLabel]);

    // Debounced amount for simulation
    const debouncedAmount = useDebounce(amount, 500);

    // Simulate transactions
    useEffect(() => {
        if (!connected || !walletAddress || !debouncedAmount || (actionType === 'withdraw' && withdrawal)) {
            setSimulation(null);
            return;
        }

        const simulate = async () => {
            setSimulating(true);
            setSimulation(null);

            try {
                const inputAmount = parseFloat(debouncedAmount);
                if (!isNaN(inputAmount) && inputAmount > 0) {
                    const vaultContract = new VaultContract(contracts.vault);
                    const amountInStroops = BigInt(Math.floor(inputAmount * 1e7));

                    let operationXdr: string;
                    if (actionType === 'deposit') {
                        operationXdr = vaultContract.deposit({
                            receiver: walletAddress,
                            tokens: amountInStroops
                        });
                    } else {
                        operationXdr = vaultContract.queueWithdraw({
                            owner: walletAddress,
                            shares: amountInStroops
                        });
                    }

                    const result = await simulateTransaction(operationXdr);
                    setSimulation(result);
                }
            } catch (error) {
                console.error('Simulation failed:', error);
            } finally {
                setSimulating(false);
            }
        };

        simulate();
    }, [debouncedAmount, actionType, connected, walletAddress, withdrawal, contracts.vault, simulateTransaction]);

    // Handle submit
    const handleSubmit = async () => {
        if (!walletAddress || !amount) return;

        try {
            const vaultContract = new VaultContract(contracts.vault);
            const inputAmount = BigInt(Math.floor(parseFloat(amount) * 1e7));

            let operationXdr: string;
            if (actionType === 'deposit') {
                operationXdr = vaultContract.deposit({
                    receiver: walletAddress,
                    tokens: inputAmount
                });
            } else {
                operationXdr = vaultContract.queueWithdraw({
                    owner: walletAddress,
                    shares: inputAmount
                });
            }

            const result = await submitTransaction(operationXdr);

            if (result.success) {
                setAmount('');
                if (actionType === 'withdraw') {
                    refetchWithdrawal();
                }
                queryClient.invalidateQueries({ queryKey: ['vault'] });
                queryClient.invalidateQueries({ queryKey: ['token-balance'] });
            }
        } catch (error) {
            console.error(`${actionType} failed:`, error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vault Actions</CardTitle>
                <CardDescription>
                    Deposit tokens to earn yield or withdraw your shares
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Always show withdrawal status at the top if it exists */}


                {/* Action type toggle */}
                <ToggleGroup
                    type="single"
                    value={actionType}
                    onValueChange={(value) => value && setActionType(value as ActionType)}
                    className="w-full"
                >
                    <ToggleGroupItem value="deposit" className="flex-1">
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Deposit
                    </ToggleGroupItem>
                    <ToggleGroupItem value="withdraw" className="flex-1" disabled={!!withdrawal}>
                        <ArrowUpFromLine className="mr-2 h-4 w-4" />
                        Withdraw
                    </ToggleGroupItem>
                </ToggleGroup>

                {/* Amount input */}
                <div className="space-y-2">
                    <Label htmlFor="amount">
                        {actionType === 'deposit' ? 'Deposit Amount' : 'Withdraw Shares'}
                    </Label>
                    <div className="flex items-center space-x-2">
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={!connected || (actionType === 'withdraw' && !!withdrawal)}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(currentBalance || '0')}
                            disabled={!connected || !currentBalance || (actionType === 'withdraw' && !!withdrawal)}
                        >
                            MAX
                        </Button>
                    </div>
                    {currentBalance && (
                        <p className="text-sm text-muted-foreground">
                            Balance: {currentBalance} {balanceLabel}
                        </p>
                    )}
                </div>

                {/* Always show estimate, even without wallet connected */}
                {amount && parseFloat(amount) > 0 && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            You will receive approximately <strong>{estimatedOutput.value}</strong> {estimatedOutput.label}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Show vault info for withdrawals */}
                {actionType === 'withdraw' && vaultState && !withdrawal && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Withdrawals have a {vaultState.lockTime / 60} minute lock period.
                            Early withdrawal incurs a {(vaultState.penaltyRate * 100).toFixed(1)}% penalty.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Error messages */}
                {actionError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{actionError}</AlertDescription>
                    </Alert>
                )}

                {/* Simulation result */}
                {simulation && amount && (
                    <Alert variant={simulation.success ? 'default' : 'destructive'}>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            {simulation.success
                                ? `Estimated fee: 0.1 XLM`
                                : simulation.error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Submit button */}
                <Button
                    onClick={handleSubmit}
                    disabled={
                        !connected ||
                        !!actionError ||
                        isTransacting ||
                        simulating ||
                        !simulation?.success ||
                        (actionType === 'withdraw' && !!withdrawal)
                    }
                    className="w-full"
                >
                    {isTransacting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {actionType === 'deposit' ? 'Depositing...' : 'Queuing Withdrawal...'}
                        </>
                    ) : simulating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Simulating...
                        </>
                    ) : (
                        <>
                            {actionType === 'deposit' ? (
                                <ArrowDownToLine className="mr-2 h-4 w-4" />
                            ) : (
                                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                            )}
                            {actionType === 'deposit' ? 'Deposit' : 'Queue Withdrawal'}
                        </>
                    )}
                </Button>

                <VaultWithdrawal />
            </CardContent>
        </Card>
    );
}