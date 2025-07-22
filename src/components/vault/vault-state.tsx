'use client';

import { VaultState } from '@zenith-protocols/vault-sdk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
    TrendingUp,
    Wallet,
    Lock,
    AlertTriangle,
    Activity
} from 'lucide-react';

interface VaultStateProps {
    vaultAddress: string;
    vaultState: VaultState;
}

export function VaultStateDisplay({ vaultAddress, vaultState }: VaultStateProps) {
    const sharePrice = vaultState.sharePrice();
    const utilizationRate = vaultState.totalTokens > 0
        ? ((vaultState.totalTokens - vaultState.balance) / vaultState.totalTokens) * 100
        : 0;

    // Format numbers for display
    const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    const formatPercentage = (num: number): string => {
        return `${(num * 100).toFixed(1)}%`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vault Overview</CardTitle>
                <CardDescription className="font-mono text-xs">
                    {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            Total Value Locked
                        </p>
                        <p className="text-2xl font-bold">{formatNumber(vaultState.totalTokens)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Share Price
                        </p>
                        <p className="text-2xl font-bold">{sharePrice.toFixed(4)}</p>
                    </div>
                </div>

                <Separator />

                {/* Liquidity Info */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Available Liquidity</span>
                        <span className="text-sm text-muted-foreground">{formatNumber(vaultState.balance)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Utilization</span>
                        <span className="text-sm font-medium">{utilizationRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={utilizationRate} className="h-2" />
                </div>

                <Separator />

                {/* Configuration */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium">Configuration</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Withdrawal Lock Period
                            </span>
                            <Badge variant="secondary">
                                {vaultState.lockTime / 60} minutes
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Max Early Withdrawal Penalty
                            </span>
                            <Badge variant="destructive">
                                {formatPercentage(vaultState.penaltyRate)}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                Min Liquidity Rate
                            </span>
                            <Badge variant="secondary">
                                {formatPercentage(vaultState.minLiquidityRate)}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Strategies */}
                {vaultState.strategies.size > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Active Strategies</h4>
                            <div className="space-y-2">
                                {Array.from(vaultState.strategies.entries()).map(([address, data]) => (
                                    <div key={address} className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {address.slice(0, 8)}...{address.slice(-6)}
                                        </span>
                                        <Badge variant="outline">
                                            {formatNumber(Number(data.borrowed))} borrowed
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}