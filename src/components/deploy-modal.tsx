// src/components/deploy-modal.tsx
'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useWalletStore } from '@/stores/wallet-store';
import { WASM_HASHES } from '@/lib/constants';
import { deployVault } from '@/lib/deploy';
import { AlertCircle, Loader2, Plus, X, Info } from 'lucide-react';
import { toast } from 'sonner';

interface DeployModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeployModal({ open, onOpenChange }: DeployModalProps) {
    const { connected, walletAddress, network, submitTransaction } = useWalletStore(state => ({
        connected: state.connected,
        walletAddress: state.walletAddress,
        network: state.network,
        submitTransaction: state.submitTransaction
    }));

    // Form state
    const [tokenAddress, setTokenAddress] = useState('');
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [strategies, setStrategies] = useState<string[]>(['']);
    const [minLiquidityRate, setMinLiquidityRate] = useState('10');
    const [redemptionDelay, setRedemptionDelay] = useState('86400');
    const [maxPenaltyRate, setMaxPenaltyRate] = useState('10');
    const [deploying, setDeploying] = useState(false);

    const isTestnet = network.passphrase.includes('Test');
    const wasmHashes = isTestnet ? WASM_HASHES.testnet : WASM_HASHES.mainnet;

    // Add/remove strategy handlers
    const addStrategy = () => setStrategies([...strategies, '']);
    const removeStrategy = (index: number) => {
        setStrategies(strategies.filter((_, i) => i !== index));
    };
    const updateStrategy = (index: number, value: string) => {
        const newStrategies = [...strategies];
        newStrategies[index] = value;
        setStrategies(newStrategies);
    };

    // Reset form
    const resetForm = () => {
        setTokenAddress('');
        setName('');
        setSymbol('');
        setStrategies(['']);
        setMinLiquidityRate('10');
        setRedemptionDelay('86400');
        setMaxPenaltyRate('10');
    };

    const handleDeploy = async () => {
        if (!connected || !walletAddress) {
            toast.error('Please connect your wallet first');
            return;
        }

        // Validate form
        if (!tokenAddress || !name || !symbol) {
            toast.error('Please fill in all required fields');
            return;
        }

        const validStrategies = strategies.filter(s => s.trim() !== '');
        if (validStrategies.length === 0) {
            toast.error('Please add at least one strategy address');
            return;
        }

        setDeploying(true);

        try {
            // Create deployment transaction
            const deployTx = await deployVault({
                network,
                source: walletAddress,
                wasmHash: wasmHashes.vault,
                tokenWasmHash: wasmHashes.token,
                tokenAddress,
                name,
                symbol,
                strategies: validStrategies,
                minLiquidityRate: Number(minLiquidityRate),
                redemptionDelay: Number(redemptionDelay),
                maxPenaltyRate: Number(maxPenaltyRate),
            });

            // Submit transaction
            const result = await submitTransaction(deployTx);

            if (result.success) {
                toast.success('Vault deployed successfully!');
                // TODO: Extract contract ID from result and show it to user
                resetForm();
                onOpenChange(false);
            } else {
                toast.error(result.error || 'Failed to deploy vault');
            }
        } catch (error) {
            console.error('Deployment error:', error);
            toast.error('Failed to create deployment transaction');
        } finally {
            setDeploying(false);
        }
    };

    const isFormValid = tokenAddress && name && symbol && strategies.some(s => s.trim() !== '');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Deploy New Vault</DialogTitle>
                    <DialogDescription>
                        Configure and deploy a new vault contract on {isTestnet ? 'Testnet' : 'Mainnet'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!connected && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Please connect your wallet to deploy a vault
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Token Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Token Configuration</h3>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="token">
                                    Underlying Token Address
                                    <span className="ml-1 text-destructive">*</span>
                                </Label>
                                <Input
                                    id="token"
                                    placeholder="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
                                    value={tokenAddress}
                                    onChange={(e) => setTokenAddress(e.target.value)}
                                    className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The token that will be deposited into the vault (e.g., USDC)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Vault Token Name
                                        <span className="ml-1 text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        placeholder="Vault USDC"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="symbol">
                                        Vault Token Symbol
                                        <span className="ml-1 text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="symbol"
                                        placeholder="vUSDC"
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value)}
                                        maxLength={12}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Strategy Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium">Authorized Strategies</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Strategies that can borrow from this vault
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addStrategy}
                                className="gap-2"
                            >
                                <Plus className="h-3 w-3" />
                                Add Strategy
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {strategies.map((strategy, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder="Strategy contract address"
                                        value={strategy}
                                        onChange={(e) => updateStrategy(index, e.target.value)}
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeStrategy(index)}
                                        disabled={strategies.length === 1}
                                        className="shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Vault Parameters */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Vault Parameters</h3>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minLiquidity">
                                    Minimum Liquidity Rate (%)
                                </Label>
                                <Input
                                    id="minLiquidity"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={minLiquidityRate}
                                    onChange={(e) => setMinLiquidityRate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Minimum percentage of assets that must remain in the vault for withdrawals
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="redemptionDelay">
                                    Redemption Delay (seconds)
                                </Label>
                                <Input
                                    id="redemptionDelay"
                                    type="number"
                                    min="0"
                                    value={redemptionDelay}
                                    onChange={(e) => setRedemptionDelay(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Time users must wait between requesting and executing redemption (default: 24 hours)
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxPenalty">
                                    Emergency Redemption Penalty (%)
                                </Label>
                                <Input
                                    id="maxPenalty"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={maxPenaltyRate}
                                    onChange={(e) => setMaxPenaltyRate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Penalty for redeeming before the delay period ends
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Info Alert */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Deployment will create two contracts: the vault contract and a share token contract.
                            Make sure you have enough XLM for transaction fees.
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={deploying}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeploy}
                        disabled={!connected || !isFormValid || deploying}
                    >
                        {deploying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deploying...
                            </>
                        ) : (
                            'Deploy Vault'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}