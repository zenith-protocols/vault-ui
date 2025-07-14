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
import { AlertCircle, Loader2, Plus, X, Info, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { VaultContract } from '@zenith-protocols/vault-sdk';
import { StrKey } from '@stellar/stellar-sdk';
import { generateSalt, generateContractId } from '@/lib/stellar/deploy';

interface DeployModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SCALAR_7 = 10_000_000;

export function DeployModal({ open, onOpenChange }: DeployModalProps) {
    const walletAddress = useWalletStore(state => state.walletAddress);
    const network = useWalletStore(state => state.network);
    const submitTransaction = useWalletStore(state => state.submitTransaction);
    const connected = useWalletStore(state => state.connected);

    // Form state
    const [tokenAddress, setTokenAddress] = useState('');
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [strategies, setStrategies] = useState<string[]>(['']);
    const [minLiquidityRate, setMinLiquidityRate] = useState('10');
    const [redemptionDelay, setRedemptionDelay] = useState('86400');
    const [maxPenaltyRate, setMaxPenaltyRate] = useState('10');
    const [deploying, setDeploying] = useState(false);
    const [deployedContractId, setDeployedContractId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isTestnet = network.passphrase.includes('Test');
    const wasmHashes = isTestnet ? WASM_HASHES.testnet : WASM_HASHES.mainnet;

    // Add or remove strategy inputs
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
        setDeployedContractId(null);
        setCopied(false);
    };

    // Copy contract ID to clipboard
    const copyContractId = () => {
        if (deployedContractId) {
            navigator.clipboard.writeText(deployedContractId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Contract ID copied to clipboard');
        }
    };

    // Create deploy transaction
    const createDeployTransaction = () => {
        if (!walletAddress) throw new Error('Wallet not connected');

        // Convert percentage rates to SCALAR_7 format
        const minLiquidityRateScaled = BigInt(Math.floor(parseFloat(minLiquidityRate) * SCALAR_7 / 100));
        const maxPenaltyRateScaled = BigInt(Math.floor(parseFloat(maxPenaltyRate) * SCALAR_7 / 100));
        const lockTime = BigInt(redemptionDelay);

        // Filter out empty strategies and validate addresses
        const validStrategies = strategies
            .filter(s => s.trim() !== '')
            .map(s => {
                if (!StrKey.isValidContract(s)) {
                    throw new Error(`Invalid strategy address: ${s}`);
                }
                return s;
            });

        // Validate token address
        if (!StrKey.isValidContract(tokenAddress)) {
            throw new Error('Invalid token address');
        }

        // Generate salt for deterministic contract ID
        const salt = generateSalt();
        const contractId = generateContractId(walletAddress, salt, network.passphrase);

        // Use VaultContract.deploy from the SDK
        const operationXdr = VaultContract.deploy(
            walletAddress,
            wasmHashes.vault,
            {
                token: tokenAddress,
                token_wasm_hash: wasmHashes.token,
                name: name,
                symbol: symbol,
                strategies: validStrategies,
                lock_time: lockTime,
                penalty_rate: maxPenaltyRateScaled,
                min_liquidity_rate: minLiquidityRateScaled
            },
            salt
        );

        return { operationXdr, contractId };
    };

    // Handle deployment
    const handleDeploy = async () => {
        if (!connected || !walletAddress) {
            toast.error('Please connect your wallet');
            return;
        }

        setDeploying(true);
        setDeployedContractId(null);

        try {
            // Create the deployment transaction
            const { operationXdr, contractId } = createDeployTransaction();

            // Show predicted contract ID
            toast.info(`Predicted contract ID: ${contractId.slice(0, 10)}...`);

            // Submit via wallet
            const result = await submitTransaction(operationXdr);

            if (result.success) {
                // Use the pre-generated contract ID
                setDeployedContractId(contractId);
                toast.success('Vault deployed successfully!');

                // Don't close modal immediately so user can copy the contract ID
            } else {
                toast.error(result.error || 'Failed to deploy vault');
            }
        } catch (error) {
            console.error('Deployment error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create deployment transaction');
        } finally {
            setDeploying(false);
        }
    };

    const isFormValid = tokenAddress && name && symbol && strategies.some(s => s.trim() !== '');

    // If contract is deployed, show success screen
    if (deployedContractId) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            <CheckCircle className="inline-block mr-2 h-6 w-6 text-green-600" />
                            Vault Deployed Successfully
                        </DialogTitle>
                        <DialogDescription>
                            Your vault has been deployed to the Stellar network
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="rounded-lg border p-4">
                            <Label className="text-sm text-muted-foreground">Contract Address</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                                    {deployedContractId}
                                </code>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={copyContractId}
                                >
                                    {copied ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Save this contract address! You'll need it to interact with your vault.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={resetForm}
                        >
                            Deploy Another
                        </Button>
                        <Button
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Normal deployment form
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Deploy New Vault</DialogTitle>
                    <DialogDescription>
                        Configure and deploy a new vault contract on {isTestnet ? 'testnet' : 'mainnet'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Token Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Token Configuration</h3>
                        <div className="space-y-2">
                            <Label htmlFor="token">Token Address</Label>
                            <Input
                                id="token"
                                placeholder="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
                                value={tokenAddress}
                                onChange={(e) => setTokenAddress(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                The underlying token that will be deposited into the vault
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Share Token Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Vault USDC"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Share Token Symbol</Label>
                                <Input
                                    id="symbol"
                                    placeholder="vUSDC"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Strategies */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Authorized Strategies</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addStrategy}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Strategy
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {strategies.map((strategy, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        placeholder="Strategy contract address"
                                        value={strategy}
                                        onChange={(e) => updateStrategy(index, e.target.value)}
                                        className="font-mono text-sm"
                                    />
                                    {strategies.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeStrategy(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Only these contracts can borrow from the vault
                        </p>
                    </div>

                    <Separator />

                    {/* Vault Parameters */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium">Vault Parameters</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="liquidity">Minimum Liquidity Rate (%)</Label>
                                <Input
                                    id="liquidity"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={minLiquidityRate}
                                    onChange={(e) => setMinLiquidityRate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Minimum % of tokens that must remain in vault
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="penalty">Max Penalty Rate (%)</Label>
                                <Input
                                    id="penalty"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={maxPenaltyRate}
                                    onChange={(e) => setMaxPenaltyRate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Maximum penalty for early withdrawals
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="delay">Redemption Delay (seconds)</Label>
                            <Input
                                id="delay"
                                type="number"
                                min="0"
                                value={redemptionDelay}
                                onChange={(e) => setRedemptionDelay(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Time users must wait before completing withdrawals (default: 86400 = 24 hours)
                            </p>
                        </div>
                    </div>

                    {/* Warning */}
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Deployment will create a new vault contract. Make sure all parameters are correct as they cannot be changed after deployment.
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
                        disabled={!isFormValid || deploying || !connected}
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