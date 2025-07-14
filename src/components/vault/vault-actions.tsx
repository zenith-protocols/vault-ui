// src/components/vault/vault-actions.tsx
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
    const walletAddress = useWalletStore(state => state.walletAddress);
    const network = useWalletStore(state => state.network);
    const submitTransaction = useWalletStore(state => state.submitTransaction);
    const simulateTransaction = useWalletStore(state => state.simulateTransaction);
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

    // Validation
    const actionError = useMemo(() => {
        if (!walletAddress) return 'Connect wallet to continue';
        if (!amount) return null;

        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) return 'Enter a valid amount';

        if (currentBalance && inputAmount > parseFloat(currentBalance)) {
            return `Insufficient ${balanceLabel}`;
        }

        if (actionType === 'deposit' && inputAmount < 1) return 'Minimum deposit is 1 token';
        if (actionType === 'withdraw' && inputAmount < 0.01) return 'Minimum withdrawal is 0.01 shares';

        // Check if user already has pending redemption
        if (actionType === 'withdraw' && vaultData?.userRedemption) {
            return 'You already have a pending redemption';
        }

        return null;
    }, [walletAddress, amount, currentBalance, actionType, vaultData, balanceLabel]);

    // Simulate transaction
    useEffect(() => {
        if (!walletAddress || !amount || actionError) {
            setSimulationResult(null);
            return;
        }

        const simulate = async () => {
            setIsSimulating(true);
            try {
                const inputAmount = parseFloat(amount);
                const vaultContract = new VaultContract(vaultAddress);
                const amountInStroops = BigInt(Math.floor(inputAmount * 1e7));

                let tx;
                if (actionType === 'deposit') {
                    tx = vaultContract.deposit(amountInStroops, walletAddress, walletAddress);
                } else {
                    tx = vaultContract.requestRedeem(amountInStroops, walletAddress);
                }

                const result = await simulateTransaction(tx);
                setSimulationResult(result);
            } catch (error) {
                console.error('Simulation failed:', error);
                setSimulationResult({ success: false, error: 'Simulation failed' });
            } finally {
                setIsSimulating(false);
            }
        };

        // Debounce simulation
        const timer = setTimeout(simulate, 500);
        return () => clearTimeout(timer);
    }, [walletAddress, amount, actionType, actionError, network, vaultAddress]);

    // Handle submit
    const handleSubmit = async () => {
        if (!walletAddress || !amount || actionError || !simulationResult?.success) return;

        setIsProcessing(true);
        try {
            const inputAmount = parseFloat(amount);
            const vaultContract = new VaultContract(vaultAddress);
            const amountInStroops = BigInt(Math.floor(inputAmount * 1e7));

            let tx;
            if (actionType === 'deposit') {
                tx = vaultContract.deposit(amountInStroops, walletAddress, walletAddress);
            } else {
                tx = vaultContract.requestRedeem(amountInStroops, walletAddress);
            }

            const result = await submitTransaction(tx);

            if (result.success) {
                toast.success(
                    actionType === 'deposit'
                        ? 'Deposit successful!'
                        : 'Withdrawal request submitted!'
                );
                setAmount('');
                queryClient.invalidateQueries();
                onTransactionComplete?.();
            } else {
                toast.error(result.error || `${actionType} failed`);
            }
        } catch (error) {
            console.error(`${actionType} failed:`, error);
            toast.error(`Failed to ${actionType}`);
        } finally {
            setIsProcessing(false);
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
                    <ToggleGroupItem
                        value="withdraw"
                        className="flex-1"
                        disabled={!!vaultData?.userRedemption}
                    >
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
                            disabled={isProcessing}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(currentBalance || '0')}
                            disabled={!walletAddress || !currentBalance}
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

                {/* Estimated output */}
                {amount && parseFloat(amount) > 0 && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            You will receive approximately <strong>{estimatedOutput.value}</strong> {estimatedOutput.label}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Vault info for withdrawals */}
                {actionType === 'withdraw' && vaultData && !vaultData.userRedemption && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Withdrawals have a {vaultData.redemptionDelay / 60} minute lock period.
                            Early withdrawal incurs up to {(vaultData.maxPenaltyRate * 100).toFixed(1)}% penalty.
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
                {simulationResult && !actionError && (
                    <Alert variant={simulationResult.success ? 'default' : 'destructive'}>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            {simulationResult.success
                                ? `Estimated fee: ${simulationResult.fee || '0.1'} XLM`
                                : simulationResult.error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Submit button */}
                <Button
                    onClick={handleSubmit}
                    disabled={
                        !walletAddress ||
                        !!actionError ||
                        isProcessing ||
                        isSimulating ||
                        !simulationResult?.success
                    }
                    className="w-full"
                    size="lg"
                >
                    {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : actionType === 'deposit' ? (
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                    ) : (
                        <ArrowUpFromLine className="mr-2 h-4 w-4" />
                    )}
                    {isProcessing
                        ? 'Processing...'
                        : actionType === 'deposit'
                            ? 'Deposit'
                            : 'Request Withdrawal'}
                </Button>
            </CardContent>
        </Card>
    );
}