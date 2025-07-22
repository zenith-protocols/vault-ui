'use client';

import { useEffect, useState } from 'react';
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
import { AlertCircle, Loader2, Plus, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { VaultContract } from '@zenith-protocols/vault-sdk';
import { StrKey } from '@stellar/stellar-sdk';
import { generateSalt } from '@/lib/stellar/deploy';
import { WASM_HASHES } from '@/lib/stellar/constants';
import { scValToNative, xdr } from '@stellar/stellar-sdk';

interface DeployModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SCALAR_7 = 10_000_000;

export function DeployModal({ open, onOpenChange, onVaultDeployed }: DeployModalProps & { onVaultDeployed: (contractId: string) => void }) {
    // Change: Now we get the whole context object directly
    const { walletAddress, network, submitTransaction, connected } = useWalletStore();

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

    // WASM hashes state 
    const [vaultWasmHash, setVaultWasmHash] = useState('');
    const [tokenWasmHash, setTokenWasmHash] = useState('');

    const isTestnet = network.passphrase.includes('Test');
    const defaultWasmHashes = isTestnet ? WASM_HASHES.testnet : WASM_HASHES.mainnet;

    // Initialize WASM hashes with defaults
    useEffect(() => {
        if (!vaultWasmHash && defaultWasmHashes?.vault) {
            setVaultWasmHash(defaultWasmHashes.vault);
        }
        if (!tokenWasmHash && defaultWasmHashes?.token) {
            setTokenWasmHash(defaultWasmHashes.token);
        }
    }, [defaultWasmHashes, vaultWasmHash, tokenWasmHash]);

    const handleAddStrategy = () => {
        setStrategies([...strategies, '']);
    };

    const handleRemoveStrategy = (index: number) => {
        setStrategies(strategies.filter((_, i) => i !== index));
    };

    const handleStrategyChange = (index: number, value: string) => {
        const newStrategies = [...strategies];
        newStrategies[index] = value;
        setStrategies(newStrategies);
    };

    const validateForm = () => {
        if (!tokenAddress || !StrKey.isValidContract(tokenAddress)) {
            toast.error('Invalid token contract address');
            return false;
        }

        if (!name || name.length > 32) {
            toast.error('Name must be 1-32 characters');
            return false;
        }

        if (!symbol || symbol.length > 12) {
            toast.error('Symbol must be 1-12 characters');
            return false;
        }

        // Accept both contract (C...) and user (G...) addresses for strategies
        const validStrategies = strategies.filter(s => s && (StrKey.isValidContract(s) || StrKey.isValidEd25519PublicKey(s)));
        if (validStrategies.length === 0) {
            toast.error('At least one valid strategy address is required');
            return false;
        }

        // Validate WASM hashes
        if (!vaultWasmHash || vaultWasmHash.length !== 64) {
            toast.error('Invalid vault WASM hash (must be 64 characters)');
            return false;
        }

        if (!tokenWasmHash || tokenWasmHash.length !== 64) {
            toast.error('Invalid token WASM hash (must be 64 characters)');
            return false;
        }

        return true;
    };

    // Handle successful deploy: decode contract address, close modal, and redirect to vault
    // txResponse is expected to be an object with a returnValue property of type ScVal
    const handleDeploySuccess = (txResponse: { returnValue?: xdr.ScVal } | unknown) => {
        let contractAddress = null;
        if (typeof txResponse === 'object' && txResponse !== null && 'returnValue' in txResponse) {
            const returnValue = (txResponse as { returnValue?: xdr.ScVal }).returnValue;
            if (returnValue !== undefined) {
                try {
                    contractAddress = scValToNative(returnValue);
                } catch (e) {
                    console.error('Failed to decode contract address:', e);
                }
            }
        }
        if (contractAddress && typeof contractAddress === 'string') {
            setDeployedContractId(null);
            onOpenChange(false);
            onVaultDeployed(contractAddress); // <-- Notify parent to load the new vault
        } else {
            toast.error('Vault deployed, but failed to decode contract address.');
        }
    };

    const handleDeploy = async () => {
        if (!connected || !walletAddress) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!validateForm()) return;

        setDeploying(true);
        try {
            // Generate salt for deployment
            const salt = generateSalt();
            // Filter valid strategies
            const validStrategies = strategies.filter(s => s && StrKey.isValidContract(s));

            // Create deploy operation with correct parameters
            const deployOp = VaultContract.deploy(
                walletAddress,  // deployer
                vaultWasmHash,  // use custom or default wasmHash
                {
                    token: tokenAddress,
                    token_wasm_hash: tokenWasmHash,  // use custom or default token hash
                    name,
                    symbol,
                    strategies: validStrategies,
                    lock_time: BigInt(redemptionDelay),  // Convert to BigInt
                    penalty_rate: BigInt(Math.floor(parseFloat(maxPenaltyRate) / 100 * SCALAR_7)),  // Convert to BigInt
                    min_liquidity_rate: BigInt(Math.floor(parseFloat(minLiquidityRate) / 100 * SCALAR_7)),  // Convert to BigInt
                },
                salt
            );

            // Submit transaction
            const result = await submitTransaction(deployOp);

            if (result.success) {
                // Use handleDeploySuccess to process the result
                handleDeploySuccess(result.result);
            } else {
                toast.error(result.error || 'Failed to deploy vault');
            }
        } catch (error) {
            console.error('Deploy error:', error);
            toast.error('Failed to deploy vault');
        } finally {
            setDeploying(false);
        }
    };

    const resetForm = () => {
        setTokenAddress('');
        setName('');
        setSymbol('');
        setStrategies(['']);
        setMinLiquidityRate('10');
        setRedemptionDelay('86400');
        setMaxPenaltyRate('10');
        setDeployedContractId(null);
    };

    const handleClose = () => {
        if (!deploying) {
            resetForm();
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Deploy New Vault</DialogTitle>
                    <DialogDescription>
                        Configure and deploy a new vault contract on {isTestnet ? 'testnet' : 'mainnet'}
                    </DialogDescription>
                </DialogHeader>

                {deployedContractId ? (
                    null
                ) : (
                    <div className="space-y-6">
                        {/* Basic Configuration */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Basic Configuration</h3>

                            <div className="space-y-2">
                                <Label htmlFor="token">Underlying Token Address</Label>
                                <Input
                                    id="token"
                                    placeholder="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
                                    value={tokenAddress}
                                    onChange={(e) => setTokenAddress(e.target.value)}
                                    disabled={deploying}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Vault Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="My Vault"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={deploying}
                                        maxLength={32}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="symbol">Vault Symbol</Label>
                                    <Input
                                        id="symbol"
                                        placeholder="MVLT"
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value)}
                                        disabled={deploying}
                                        maxLength={12}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Strategies */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Strategies</h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddStrategy}
                                    disabled={deploying}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Strategy
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {strategies.map((strategy, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            placeholder="Strategy contract address"
                                            value={strategy}
                                            onChange={(e) => handleStrategyChange(index, e.target.value)}
                                            disabled={deploying}
                                        />
                                        {strategies.length > 1 && (
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => handleRemoveStrategy(index)}
                                                disabled={deploying}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    Add at least one strategy contract that will manage vault funds
                                </AlertDescription>
                            </Alert>
                        </div>

                        <Separator />

                        {/* Risk Parameters */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Risk Parameters</h3>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="minLiquidity">
                                        Min Liquidity (%)
                                    </Label>
                                    <Input
                                        id="minLiquidity"
                                        type="number"
                                        value={minLiquidityRate}
                                        onChange={(e) => setMinLiquidityRate(e.target.value)}
                                        disabled={deploying}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="redemptionDelay" className="flex items-center gap-2">
                                        Lock time (s)
                                    </Label>
                                    <Input
                                        id="redemptionDelay"
                                        type="number"
                                        value={redemptionDelay}
                                        onChange={(e) => setRedemptionDelay(e.target.value)}
                                        disabled={deploying}
                                        min="0"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="maxPenalty">
                                        Max Penalty (%)
                                    </Label>
                                    <Input
                                        id="maxPenalty"
                                        type="number"
                                        value={maxPenaltyRate}
                                        onChange={(e) => setMaxPenaltyRate(e.target.value)}
                                        disabled={deploying}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Contract Configuration */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Contract Configuration</h3>
                            <div className="space-y-2">
                                <Label htmlFor="vaultWasm">Vault WASM Hash</Label>
                                <Input
                                    id="vaultWasm"
                                    placeholder="Vault contract WASM hash"
                                    value={vaultWasmHash}
                                    onChange={(e) => setVaultWasmHash(e.target.value)}
                                    disabled={deploying}
                                    className="font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tokenWasm">Token WASM Hash (for share token)</Label>
                                <Input
                                    id="tokenWasm"
                                    placeholder="Token contract WASM hash"
                                    value={tokenWasmHash}
                                    onChange={(e) => setTokenWasmHash(e.target.value)}
                                    disabled={deploying}
                                    className="font-mono text-xs"
                                />
                            </div>
                        </div>

                        {!connected && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Please connect your wallet to deploy a vault
                                </AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={deploying}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeploy}
                                disabled={deploying || !connected}
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
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}