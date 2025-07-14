// src/components/vault/vault-state.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
    TrendingUp,
    Wallet,
    Lock,
    AlertTriangle,
    Info,
    Users,
    DollarSign,
    Activity
} from 'lucide-react';

interface VaultStateProps {
    vaultAddress: string;
    vaultData: any;
}

export function VaultState({ vaultAddress, vaultData }: VaultStateProps) {
    if (!vaultData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vault Overview</CardTitle>
                    <CardDescription>Loading vault data...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-96 flex items-center justify-center text-muted-foreground">
                        <Info className="h-8 w-8" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const sharePrice = vaultData.sharePrice || 1;
    const utilizationRate = vaultData.totalTokens > 0
        ? ((vaultData.totalTokens - vaultData.availableLiquidity) / vaultData.totalTokens) * 100
        : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vault Overview</CardTitle>
                <CardDescription className="font-mono text-xs">
                    {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Token Info */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Asset</span>
                    </div>
                    <Badge variant="secondary">{vaultData.tokenSymbol}</Badge>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            Total Value Locked
                        </p>
                        <p className="text-2xl font-bold">{vaultData.totalValueLocked}</p>
                        <p className="text-xs text-muted-foreground">{vaultData.tokenSymbol}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Total Shares
                        </p>
                        <p className="text-2xl font-bold">{vaultData.totalShares}</p>
                        <p className="text-xs text-muted-foreground">shares issued</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Share Price
                        </p>
                        <p className="text-2xl font-bold">{sharePrice.toFixed(4)}</p>
                        <p className="text-xs text-muted-foreground">{vaultData.tokenSymbol}/share</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            Available Liquidity
                        </p>
                        <p className="text-2xl font-bold">{vaultData.availableLiquidity}</p>
                        <p className="text-xs text-muted-foreground">{vaultData.tokenSymbol}</p>
                    </div>
                </div>

                <Separator />

                {/* Utilization */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Utilization Rate</span>
                        <span className="font-medium">{utilizationRate.toFixed(1)}%</span>
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
                                {vaultData.redemptionDelay / 60} minutes
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Max Early Withdrawal Penalty
                            </span>
                            <Badge variant="destructive">
                                {(vaultData.maxPenaltyRate * 100).toFixed(1)}%
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                Min Liquidity Rate
                            </span>
                            <Badge variant="outline">
                                {(vaultData.minLiquidityRate * 100).toFixed(0)}%
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Strategies */}
                {vaultData.strategies && vaultData.strategies.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Active Strategies</h4>
                            <div className="space-y-2">
                                {vaultData.strategies.map((strategy: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <div>
                                            <p className="text-sm font-mono">
                                                {strategy.address.slice(0, 8)}...{strategy.address.slice(-4)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Borrowed: {strategy.borrowed} {vaultData.tokenSymbol}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={parseFloat(strategy.netImpact) >= 0 ? "default" : "destructive"}
                                            className="text-xs"
                                        >
                                            {parseFloat(strategy.netImpact) >= 0 ? '+' : ''}{strategy.netImpact}%
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* User Holdings */}
                {vaultData.userShareBalance && (
                    <>
                        <Separator />
                        <div className="rounded-lg bg-primary/5 p-4 space-y-2">
                            <h4 className="text-sm font-medium">Your Holdings</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Shares</p>
                                    <p className="text-lg font-bold">{vaultData.userShareBalance}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Value</p>
                                    <p className="text-lg font-bold">
                                        {(parseFloat(vaultData.userShareBalance) * sharePrice).toFixed(2)} {vaultData.tokenSymbol}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}