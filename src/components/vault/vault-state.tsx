'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNetwork } from '@/hooks/use-wallet';
import { useContracts } from '@/hooks/use-contracts';
import { useVaultState } from '@/hooks/use-vault';
import { useVaultStrategies } from '@/hooks/use-vault';
import { ExternalLink, TrendingUp, Users, DollarSign, Lock, AlertTriangle, Activity } from 'lucide-react';

export function VaultState() {
    const { network } = useNetwork();
    const contracts = useContracts();
    const { data: vaultState } = useVaultState(network, contracts.vault, contracts.token);
    const { data: strategiesData } = useVaultStrategies(network, contracts.vault);

    if (!vaultState) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vault Statistics</CardTitle>
                    <CardDescription>Loading vault information...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // Calculate share price
    const sharePrice = vaultState.totalShares > 0
        ? vaultState.balance / vaultState.totalShares
        : 1;

    // Get explorer URL based on network
    const explorerUrl = network.passphrase.includes('Test')
        ? 'https://stellar.expert/explorer/testnet/contract/'
        : 'https://stellar.expert/explorer/public/contract/';

    // Format address for display
    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    // Format PnL with color
    const formatPnL = (pnl: number) => {
        const isPositive = pnl >= 0;
        const sign = isPositive ? '+' : '';
        const color = isPositive ? 'text-green-600' : 'text-red-600';
        return <span className={color}>{sign}{pnl.toFixed(2)}</span>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vault Statistics</CardTitle>
                <CardDescription>Current vault performance and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Main Statistics */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            TVL
                        </p>
                        <p className="text-2xl font-bold">{vaultState.balance.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">tokens</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            Total Shares
                        </p>
                        <p className="text-2xl font-bold">{vaultState.totalShares.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">shares issued</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Share Price
                        </p>
                        <p className="text-2xl font-bold">{sharePrice.toFixed(4)}</p>
                        <p className="text-xs text-muted-foreground">tokens/share</p>
                    </div>
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
                                Early Withdrawal Penalty
                            </span>
                            <Badge variant="destructive">
                                {(vaultState.penaltyRate * 100).toFixed(1)}%
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Strategies */}
                {vaultState.strategies.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Active Strategies</h4>
                            <div className="space-y-2">
                                {vaultState.strategies.map((strategy, index) => {
                                    // Get PnL data for this strategy if available
                                    const strategyPnL = strategiesData?.[strategy] || 0;

                                    return (
                                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                                <code className="text-sm font-mono">
                                                    {formatAddress(strategy)}
                                                </code>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-sm font-medium">
                                                    P&L: {formatPnL(strategyPnL)}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2"
                                                    onClick={() => window.open(`${explorerUrl}${strategy}`, '_blank')}
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}