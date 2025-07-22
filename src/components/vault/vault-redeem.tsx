'use client';

import { useState, useMemo, useEffect } from 'react';
import { VaultState, VaultContract, VaultRedeem } from '@zenith-protocols/vault-sdk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWalletStore } from '@/stores/wallet-store';
import { toast } from 'sonner';
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2
} from 'lucide-react';

interface VaultRedeemProps {
    vaultAddress: string;
    vaultState: VaultState;
    userRedemption: VaultRedeem | null;
    onTransactionComplete?: () => void;
}

export function VaultRedeemDisplay({
    vaultAddress,
    vaultState,
    userRedemption,
    onTransactionComplete
}: VaultRedeemProps) {
    const { walletAddress, submitTransaction } = useWalletStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Calculate redemption status
    const redemptionStatus = useMemo(() => {
        if (!userRedemption) return null;

        const now = Date.now() / 1000;
        const remaining = userRedemption.unlockTime - now;
        const isUnlocked = remaining <= 0;
        const progress = Math.max(0, Math.min(100, ((vaultState.lockTime - remaining) / vaultState.lockTime) * 100));

        // Use the shares from VaultRedeem
        const estimatedTokens = vaultState.sharesToTokens(userRedemption.shares);

        return {
            isUnlocked,
            timeRemaining: Math.max(0, remaining),
            progress,
            shares: userRedemption.shares,
            estimatedTokens
        };
    }, [userRedemption, vaultState]);

    // Update time remaining every second
    useEffect(() => {
        if (!redemptionStatus || redemptionStatus.isUnlocked) return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [redemptionStatus]);

    // Initialize time remaining
    useEffect(() => {
        if (redemptionStatus) {
            setTimeRemaining(redemptionStatus.timeRemaining);
        }
    }, [redemptionStatus]);

    // Format time remaining
    const formatTimeRemaining = (seconds: number): string => {
        if (seconds <= 0) return 'Ready';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
    };

    // Handle normal redemption
    const handleRedeem = async () => {
        if (!walletAddress || !redemptionStatus?.isUnlocked) return;

        setIsProcessing(true);
        try {
            const vaultContract = new VaultContract(vaultAddress);
            const tx = vaultContract.redeem({
                receiver: walletAddress,
                owner: walletAddress
            });

            const result = await submitTransaction(tx);

            if (result.success) {
                toast.success('Redemption completed successfully');
                onTransactionComplete?.();
            } else {
                toast.error(result.error || 'Redemption failed');
            }
        } catch (error) {
            console.error('Redemption failed:', error);
            toast.error('Failed to process redemption');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle emergency redemption (with penalty)
    const handleEmergencyRedeem = async () => {
        if (!walletAddress || !redemptionStatus) return;

        const penalty = redemptionStatus.estimatedTokens * vaultState.penaltyRate;
        const tokensAfterPenalty = redemptionStatus.estimatedTokens - penalty;

        const confirmed = window.confirm(
            `Emergency redemption will incur a penalty of ${(vaultState.penaltyRate * 100).toFixed(1)}%. ` +
            `You will receive approximately ${tokensAfterPenalty.toFixed(2)} tokens instead of ${redemptionStatus.estimatedTokens.toFixed(2)}. ` +
            `Continue?`
        );

        if (!confirmed) return;

        setIsProcessing(true);
        try {
            const vaultContract = new VaultContract(vaultAddress);
            const tx = vaultContract.emergencyRedeem({
                receiver: walletAddress,
                owner: walletAddress
            });

            const result = await submitTransaction(tx);

            if (result.success) {
                toast.success('Emergency redemption completed');
                onTransactionComplete?.();
            } else {
                toast.error(result.error || 'Emergency redemption failed');
            }
        } catch (error) {
            console.error('Emergency redemption failed:', error);
            toast.error('Failed to process emergency redemption');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle cancel redemption
    const handleCancelRedeem = async () => {
        if (!walletAddress) return;

        setIsProcessing(true);
        try {
            const vaultContract = new VaultContract(vaultAddress);
            const tx = vaultContract.cancelRedeem(walletAddress);

            const result = await submitTransaction(tx);

            if (result.success) {
                toast.success('Redemption cancelled');
                onTransactionComplete?.();
            } else {
                toast.error(result.error || 'Failed to cancel redemption');
            }
        } catch (error) {
            console.error('Cancel redemption failed:', error);
            toast.error('Failed to cancel redemption');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!userRedemption || !redemptionStatus) {
        return null;
    }

    const displayTimeRemaining = timeRemaining > 0 ? timeRemaining : redemptionStatus.timeRemaining;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Redemption</CardTitle>
                <CardDescription>
                    Manage your withdrawal request
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Redemption Details */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Shares to Redeem</span>
                        <span className="font-medium">{redemptionStatus.shares.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Tokens</span>
                        <span className="font-medium">{redemptionStatus.estimatedTokens.toFixed(2)}</span>
                    </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Time Remaining</span>
                        <Badge variant={redemptionStatus.isUnlocked ? "default" : "secondary"}>
                            {redemptionStatus.isUnlocked ? (
                                <>
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Ready
                                </>
                            ) : (
                                <>
                                    <Clock className="mr-1 h-3 w-3" />
                                    {formatTimeRemaining(displayTimeRemaining)}
                                </>
                            )}
                        </Badge>
                    </div>
                    <Progress value={redemptionStatus.progress} className="h-2" />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    {redemptionStatus.isUnlocked ? (
                        <Button
                            onClick={handleRedeem}
                            disabled={isProcessing}
                            className="flex-1"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Complete Redemption
                                </>
                            )}
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="destructive"
                                onClick={handleEmergencyRedeem}
                                disabled={isProcessing}
                                className="flex-1"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        Emergency Redeem
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleCancelRedeem}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <XCircle className="h-4 w-4" />
                                )}
                            </Button>
                        </>
                    )}
                </div>

                {/* Warning for emergency redemption */}
                {!redemptionStatus.isUnlocked && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Emergency redemption will incur a penalty of up to {(vaultState.penaltyRate * 100).toFixed(1)}%
                            based on time remaining.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}