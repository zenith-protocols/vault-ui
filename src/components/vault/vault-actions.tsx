'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWalletStore } from '@/stores/wallet-store';
import { useQueryClient } from '@tanstack/react-query';
import { VaultContract } from '@zenith-protocols/vault-sdk';
import { toast } from 'sonner';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    AlertCircle,
    Loader2,
    Info
} from 'lucide-react';

type ActionType = 'deposit' | 'withdraw';

interface VaultActionsProps {
    vaultAddress: string;
    vaultData: any;
    onTransactionComplete?: () => void;
}

export function VaultActions({ vaultAddress, vaultData, onTransactionComplete }: VaultActionsProps) {
    // Change: Direct access to context values
    const { walletAddress, network, submitTransaction, simulateTransaction } = useWalletStore();
    const queryClient = useQueryClient();

    // State
    const [actionType, setActionType] = useState<ActionType>('deposit');
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationResult, setSimulationResult] = useState<any>(null);

    // Get balances
    const tokenBalance = vaultData?.userTokenBalance;
    const sharesBalance = vaultData?.userShareBalance;
    const sharePrice = vaultData?.sharePrice || 1;

    // Calculate estimated output
    const estimatedOutput = useMemo(() => {
        if (!amount || !vaultData) return { value: '0', label: '' };

        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) return { value: '0', label: '' };

        if (actionType === 'deposit') {
            // Depositing tokens, get shares
            const shares = inputAmount / sharePrice;
            return { value: shares.toFixed(4), label: 'shares' };
        } else {
            // Withdrawing shares, get tokens  
            const tokens = inputAmount * sharePrice;
            return { value: tokens.toFixed(2), label: vaultData.tokenSymbol };
        }
    }, [amount, actionType, sharePrice, vaultData]);

    // Get balance for current action type
    const currentBalance = actionType === 'deposit' ? tokenBalance : sharesBalance;
    const balanceLabel = actionType === 'deposit' ? vaultData?.tokenSymbol : 'shares';

    // Simulate transaction when amount changes
    useEffect(() => {
        if (!amount || !walletAddress) {
            setSimulationResult(null);
            return;
        }

        const simulate = async () => {
            setIsSimulating(true);
            try {
                const vault = new VaultContract(vaultAddress);
                const inputAmount = parseFloat(amount);

                if (isNaN(inputAmount) || inputAmount <= 0) {
                    setSimulationResult(null);
                    return;
                }

                // Convert to smallest units
                const scaledAmount = Math.floor(inputAmount * (10 ** vaultData.tokenDecimals));

                const operation = actionType === 'deposit'
                    ? vault.deposit({
                        amount: scaledAmount,
                        from: walletAddress,
                        receiver: walletAddress
                    })
                    : vault.requestRedeem({
                        shares: scaledAmount,
                        owner: walletAddress
                    });

                const result = await simulateTransaction(operation);
                setSimulationResult(result);
            } catch (error) {
                console.error('Simulation error:', error);
                setSimulationResult({ success: false, error: 'Simulation failed' });
            } finally {
                setIsSimulating(false);
            }
        };

        const timer = setTimeout(simulate, 500);
        return () => clearTimeout(timer);
    }, [amount, actionType, walletAddress, vaultAddress, vaultData, simulateTransaction]);

    const handleAction = async () => {
        if (!walletAddress) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setIsProcessing(true);
        try {
            const vault = new VaultContract(vaultAddress);
            const inputAmount = parseFloat(amount);
            const scaledAmount = Math.floor(inputAmount * (10 ** vaultData.tokenDecimals));

            const operation = actionType === 'deposit'
                ? vault.deposit({
                    amount: scaledAmount,
                    from: walletAddress,
                    receiver: walletAddress
                })
                : vault.requestRedeem({
                    shares: scaledAmount,
                    owner: walletAddress
                });

            const result = await submitTransaction(operation);

            if (result.success) {
                toast.success(`${actionType === 'deposit' ? 'Deposit' : 'Withdrawal request'} successful!`);
                setAmount('');

                // Refresh data
                if (onTransactionComplete) {
                    onTransactionComplete();
                }

                // Invalidate queries
                queryClient.invalidateQueries({ queryKey: ['vault', vaultAddress] });
            } else {
                toast.error(result.error || `${actionType} failed`);
            }
        } catch (error) {
            console.error('Transaction error:', error);
            toast.error('Transaction failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const setMaxAmount = () => {
        if (currentBalance) {
            setAmount(currentBalance);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vault Actions</CardTitle>
                <CardDescription>
                    Deposit tokens or withdraw shares
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Action Type Toggle */}
                <ToggleGroup
                    type="single"
                    value={actionType}
                    onValueChange={(value) => value && setActionType(value as ActionType)}
                    className="grid grid-cols-2"
                >
                    <ToggleGroupItem value="deposit" aria-label="Deposit">
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Deposit
                    </ToggleGroupItem>
                    <ToggleGroupItem value="withdraw" aria-label="Withdraw">
                        <ArrowUpFromLine className="mr-2 h-4 w-4" />
                        Withdraw
                    </ToggleGroupItem>
                </ToggleGroup>

                {/* Amount Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="amount">Amount</Label>
                        <span className="text-sm text-muted-foreground">
                            Balance: {currentBalance || '0'} {balanceLabel}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isProcessing}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={setMaxAmount}
                            disabled={!currentBalance || isProcessing}
                        >
                            MAX
                        </Button>
                    </div>
                </div>

                {/* Estimated Output */}
                {amount && estimatedOutput.value !== '0' && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            You will receive approximately {estimatedOutput.value} {estimatedOutput.label}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Simulation Result */}
                {simulationResult && !simulationResult.success && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {simulationResult.error || 'Transaction simulation failed'}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Button */}
                <Button
                    className="w-full"
                    onClick={handleAction}
                    disabled={isProcessing || isSimulating || !amount || parseFloat(amount) <= 0}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            {actionType === 'deposit' ? (
                                <ArrowDownToLine className="mr-2 h-4 w-4" />
                            ) : (
                                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                            )}
                            {actionType === 'deposit' ? 'Deposit' : 'Request Withdrawal'}
                        </>
                    )}
                </Button>

                {actionType === 'withdraw' && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Withdrawals require a {vaultData.redemptionDelay / 60} minute waiting period before redemption.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}