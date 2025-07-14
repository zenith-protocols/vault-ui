'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWalletStore } from '@/stores/wallet-store';
import { useQueryClient } from '@tanstack/react-query';
import { VaultContract } from '@zenith-protocols/vault-sdk';
import { toast } from 'sonner';
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info,
    Loader2
} from 'lucide-react';

interface VaultRedeemProps {
    vaultAddress: string;
    vaultData: any;
    onTransactionComplete?: () => void;
}

export function VaultRedeem({ vaultAddress, vaultData, onTransactionComplete }: VaultRedeemProps) {
    const walletAddress = useWalletStore(state => state.walletAddress);
    const network = useWalletStore(state => state.network);
    const submitTransaction = useWalletStore(state => state.submitTransaction);
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock redemption data - replace with actual query
    const userRedemption = vaultData?.userRedemption;

    // Calculate redemption status
    const redemptionStatus = useMemo(() => {
        if (!userRedemption) return null;

        const now = Date.now() / 1000;
        const timeRemaining = userRedemption.unlockTime - now;
        const isUnlocked = timeRemaining <= 0;
        const progress = Math.max(0, Math.min(100, ((vaultData.redemptionDelay - timeRemaining) / vaultData.redemptionDelay) * 100));

        return {
            isUnlocked,
            timeRemaining: Math.max(0, timeRemaining),
            progress,
            estimatedTokens: (parseFloat(userRedemption.shares) * vaultData.sharePrice).toFixed(2)
        };
    }, [userRedemption, vaultData]);

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
        if (!walletAddress || !userRedemption || !redemptionStatus?.isUnlocked) return;

        setIsProcessing(true);
        try {
            const vaultContract = new VaultContract(vaultAddress);
            const tx = vaultContract.redeem(walletAddress, walletAddress);

            const result = await submitTransaction(tx);

            if (result.success) {
                toast.success('Redemption completed successfully');
                queryClient.invalidateQueries();
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
        if (!walletAddress || !userRedemption) return;

        setIsProcessing(true);
        try {
            const vaultContract = new VaultContract(vaultAddress);
            const tx = vaultContract.emergencyRedeem(walletAddress, walletAddress);

            const result = await submitTransaction(tx);

            if (result.success) {
                toast.success('Emergency redemption completed');
                queryClient.invalidateQueries();
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
        if (!walletAddress || !userRedemption) return;

        setIsProcessing(true);
        try {
            const vaultContract = new VaultContract(vaultAddress);
            const tx = vaultContract.cancelRedeem(walletAddress);

            const result = await submitTransaction(tx);

            if (result.success) {
                toast.success('Redemption cancelled');
                queryClient.invalidateQueries();
                onTransactionComplete?.();
            } else {
                toast.error(result.error || 'Cancel failed');
            }
        } catch (error) {
            console.error('Cancel redemption failed:', error);
            toast.error('Failed to cancel redemption');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!userRedemption) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Redemption</CardTitle>
                <CardDescription>
                    Manage your vault share redemption
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Redemption info */}
                <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Redeeming</span>
                        <span className="font-medium">{userRedemption.shares} shares</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated tokens</span>
                        <span className="font-medium">~{redemptionStatus?.estimatedTokens} {vaultData.tokenSymbol}</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Unlock progress</span>
                        <span className="font-medium">{redemptionStatus?.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={redemptionStatus?.progress || 0} className="h-2" />
                    <div className="flex items-center justify-between">
                        <Badge variant={redemptionStatus?.isUnlocked ? "default" : "secondary"}>
                            {redemptionStatus?.isUnlocked ? (
                                <>
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Ready to redeem
                                </>
                            ) : (
                                <>
                                    <Clock className="mr-1 h-3 w-3" />
                                    {formatTimeRemaining(redemptionStatus?.timeRemaining || 0)}
                                </>
                            )}
                        </Badge>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="grid gap-2">
                    {redemptionStatus?.isUnlocked ? (
                        <Button
                            onClick={handleRedeem}
                            disabled={isProcessing || !walletAddress}
                            className="w-full"
                        >
                            {isProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Complete Redemption
                        </Button>
                    ) : (
                        <>
                            {/* Emergency redeem with penalty warning */}
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Emergency redemption available with {(vaultData.maxPenaltyRate * 100).toFixed(1)}% penalty
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={handleEmergencyRedeem}
                                    disabled={isProcessing || !walletAddress}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                    )}
                                    Emergency Redeem
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleCancelRedeem}
                                    disabled={isProcessing || !walletAddress}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <XCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}