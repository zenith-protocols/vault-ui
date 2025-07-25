'use client';

import { useState, useMemo } from 'react';
import { VaultState, VaultContract } from '@zenith-protocols/vault-sdk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWalletStore } from '@/stores/wallet-store';
import { toast } from 'sonner';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    AlertCircle,
    Loader2,
    Info
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

type ActionType = 'deposit' | 'withdraw';

interface VaultActionsProps {
    vaultAddress: string;
    vaultState: VaultState;
    onTransactionComplete?: () => void;
}

export function VaultActions({ vaultAddress, vaultState, onTransactionComplete }: VaultActionsProps) {
    const { walletAddress, network, submitTransaction } = useWalletStore();

    // State
    const [actionType, setActionType] = useState<ActionType>('deposit');
    const [amount, setAmount] = useState('');
    const debouncedAmount = useDebounce(amount, 500);
    const [isProcessing, setIsProcessing] = useState(false);

    const sharePrice = vaultState.sharePrice();

    // Calculate estimated output
    const estimatedOutput = useMemo(() => {
        if (!debouncedAmount) return { value: '0', label: '' };

        const inputAmount = parseFloat(debouncedAmount);
        if (isNaN(inputAmount) || inputAmount <= 0) return { value: '0', label: '' };

        if (actionType === 'deposit') {
            // Depositing tokens, get shares
            const shares = vaultState.tokensToShares(inputAmount);
            return { value: shares.toFixed(4), label: 'shares' };
        } else {
            // Withdrawing shares, get tokens  
            const tokens = vaultState.sharesToTokens(inputAmount);
            return { value: tokens.toFixed(2), label: 'tokens' };
        }
    }, [debouncedAmount, actionType, vaultState]);

    // Handle action
    const handleAction = async () => {
        if (!walletAddress || !debouncedAmount || !network) {
            toast.error('Please connect wallet and enter amount');
            return;
        }

        const inputAmount = parseFloat(debouncedAmount);
        if (isNaN(inputAmount) || inputAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setIsProcessing(true);
        try {
            const vaultContract = new VaultContract(vaultAddress);
            let tx: string;
            let actualRate: number | null = null;
            let result;

            if (actionType === 'deposit') {
                const scaledAmount = Math.floor(inputAmount * 1e7);
                tx = vaultContract.deposit({
                    tokens: BigInt(scaledAmount),
                    receiver: walletAddress,
                    owner: walletAddress
                });
                result = await submitTransaction(tx);
                // After deposit, reload vault state to get new shares
                if (result.success) {
                    // Calculate actual shares received
                    const newVaultState = await VaultState.load(network, vaultAddress);
                    const shares = newVaultState.tokensToShares(inputAmount);
                    actualRate = shares / inputAmount;
                }
            } else {
                const scaledShares = Math.floor(inputAmount * 1e7);
                tx = vaultContract.requestRedeem({
                    shares: BigInt(scaledShares),
                    owner: walletAddress
                });
                result = await submitTransaction(tx);
                // After withdrawal, reload vault state to get new tokens
                if (result.success) {
                    const newVaultState = await VaultState.load(network, vaultAddress);
                    const tokens = newVaultState.sharesToTokens(inputAmount);
                    actualRate = tokens / inputAmount;
                }
            }

            if (result.success) {
                toast.success(
                    <div>
                        <div>{actionType === 'deposit' ? 'Deposit successful!' : 'Withdrawal request submitted!'}</div>
                        {actualRate !== null && (
                            <div className="text-xs mt-1">
                                Actual swap rate: {actualRate.toFixed(6)} {actionType === 'deposit' ? 'shares/token' : 'tokens/share'}
                            </div>
                        )}
                    </div>
                );
                setAmount('');
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

    const isConnected = !!walletAddress;

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
                    <ToggleGroupItem value="deposit" className="data-[state=on]:bg-green-500/10">
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Deposit
                    </ToggleGroupItem>
                    <ToggleGroupItem value="withdraw" className="data-[state=on]:bg-red-500/10">
                        <ArrowUpFromLine className="mr-2 h-4 w-4" />
                        Withdraw
                    </ToggleGroupItem>
                </ToggleGroup>

                {/* Amount Input */}
                <div className="space-y-2">
                    <Label htmlFor="amount">
                        Amount ({actionType === 'deposit' ? 'Tokens' : 'Shares'})
                    </Label>
                    <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isProcessing}
                    />
                </div>

                {/* Estimated Output */}
                {debouncedAmount && parseFloat(debouncedAmount) > 0 && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            You will {actionType === 'deposit' ? 'receive' : 'request withdrawal of'} approximately{' '}
                            <span className="font-semibold">
                                {estimatedOutput.value} {estimatedOutput.label}
                            </span>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Current Share Price */}
                <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Current Share Price</span>
                    <span className="text-sm font-medium">{sharePrice.toFixed(4)} tokens/share</span>
                </div>

                {/* Action Button */}
                <Button
                    className="w-full"
                    onClick={handleAction}
                    disabled={!isConnected || isProcessing || !debouncedAmount || parseFloat(debouncedAmount) <= 0 || debouncedAmount !== amount}
                    variant={actionType === 'deposit' ? 'default' : 'destructive'}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : !isConnected ? (
                        'Connect Wallet'
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

                {/* Info for withdrawals */}
                {actionType === 'withdraw' && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Withdrawals require a {vaultState.lockTime / 60} minute waiting period.
                            You can withdraw early with a penalty of up to {(vaultState.penaltyRate * 100).toFixed(1)}%.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}