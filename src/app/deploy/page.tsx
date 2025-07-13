'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWallet, useNetwork, useTransaction } from '@/hooks/use-wallet';
import {
    Operation,
    Address,
    nativeToScVal
} from '@stellar/stellar-sdk';
import { Loader2, AlertCircle, CheckCircle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

// Default WASM hashes (update these with your actual values)
const DEFAULT_VAULT_WASM_HASH = 'YOUR_VAULT_WASM_HASH_HERE';
const DEFAULT_TOKEN_WASM_HASH = 'YOUR_TOKEN_WASM_HASH_HERE';

export default function DeployPage() {
    const { connected, walletAddress } = useWallet();
    const { network } = useNetwork();
    const { submitTransaction, isTransacting } = useTransaction();

    // Form state
    const [deployedContractId, setDeployedContractId] = useState('');

    // Constructor arguments
    const [vaultWasmHash, setVaultWasmHash] = useState(DEFAULT_VAULT_WASM_HASH);
    const [tokenAddress, setTokenAddress] = useState('');
    const [tokenWasmHash, setTokenWasmHash] = useState(DEFAULT_TOKEN_WASM_HASH);
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [strategies, setStrategies] = useState<string[]>([]);
    const [lockTime, setLockTime] = useState('300'); // 5 minutes default
    const [penaltyRate, setPenaltyRate] = useState('10'); // 10% default
    const [minLiquidityRate, setMinLiquidityRate] = useState('10'); // 10% default

    // Strategy input
    const [newStrategy, setNewStrategy] = useState('');

    const addStrategy = () => {
        if (newStrategy && !strategies.includes(newStrategy)) {
            try {
                // Validate it's a valid Stellar address
                Address.fromString(newStrategy);
                setStrategies([...strategies, newStrategy]);
                setNewStrategy('');
            } catch (e) {
                toast.error('Invalid strategy address');
            }
        }
    };

    const removeStrategy = (index: number) => {
        setStrategies(strategies.filter((_, i) => i !== index));
    };

    const handleDeploy = async () => {
        if (!connected || !walletAddress) {
            toast.error('Please connect your wallet');
            return;
        }

        // Validate inputs
        if (!tokenAddress || !name || !symbol) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            // Convert percentage rates to SCALAR_7 format (multiply by 10^5 to get basis points in SCALAR_7)
            const penaltyRateScaled = Math.floor(parseFloat(penaltyRate) * 100000);
            const minLiquidityRateScaled = Math.floor(parseFloat(minLiquidityRate) * 100000);

            // Create the deployment operation
            const deployOp = Operation.createCustomContract({
                address: Address.fromString(walletAddress),
                wasmHash: Buffer.from(vaultWasmHash, 'hex'),
                constructorArgs: [
                    nativeToScVal(Address.fromString(tokenAddress), { type: 'address' }),
                    nativeToScVal(Buffer.from(tokenWasmHash, 'hex'), { type: 'bytes' }),
                    nativeToScVal(name, { type: 'string' }),
                    nativeToScVal(symbol, { type: 'string' }),
                    nativeToScVal(strategies.map(s => Address.fromString(s)), { type: 'vec', element_type: 'address' }),
                    nativeToScVal(parseInt(lockTime), { type: 'u64' }),
                    nativeToScVal(penaltyRateScaled, { type: 'i128' }),
                    nativeToScVal(minLiquidityRateScaled, { type: 'i128' })
                ],
            });

            // Get the operation XDR
            const operationXdr = deployOp.toXDR('base64');

            // Submit transaction using wallet hook
            const result = await submitTransaction(operationXdr);

            if (result.success && result.hash) {
                // Extract contract ID from the result meta
                // The contract address is returned in the transaction result
                // For now, we'll use the transaction hash as a placeholder
                setDeployedContractId(result.hash);
                toast.success('Vault deployed successfully! Check the transaction on the explorer.');
            } else {
                throw new Error(result.error || 'Transaction failed');
            }
        } catch (error) {
            console.error('Deployment error:', error);
            toast.error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="container mx-auto max-w-4xl space-y-6 py-6">
            <Card>
                <CardHeader>
                    <CardTitle>Deploy New Vault</CardTitle>
                    <CardDescription>
                        Deploy a new vault contract with your specified parameters
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* WASM Hash */}
                    <div className="space-y-2">
                        <Label htmlFor="wasmHash">Vault WASM Hash</Label>
                        <Input
                            id="wasmHash"
                            placeholder="32-byte hex hash"
                            value={vaultWasmHash}
                            onChange={(e) => setVaultWasmHash(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            The WASM hash of the vault contract code
                        </p>
                    </div>

                    <Separator />

                    {/* Token Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Token Configuration</h3>

                        <div className="space-y-2">
                            <Label htmlFor="tokenAddress">Token Address*</Label>
                            <Input
                                id="tokenAddress"
                                placeholder="C..."
                                value={tokenAddress}
                                onChange={(e) => setTokenAddress(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                The underlying token that the vault will manage
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tokenWasmHash">Token WASM Hash</Label>
                            <Input
                                id="tokenWasmHash"
                                placeholder="32-byte hex hash"
                                value={tokenWasmHash}
                                onChange={(e) => setTokenWasmHash(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                WASM hash for deploying the share token
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Share Token Name*</Label>
                                <Input
                                    id="name"
                                    placeholder="Vault Share Token"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Share Token Symbol*</Label>
                                <Input
                                    id="symbol"
                                    placeholder="vTOKEN"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Strategy Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Strategy Addresses</h3>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Strategy contract address"
                                value={newStrategy}
                                onChange={(e) => setNewStrategy(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addStrategy()}
                            />
                            <Button onClick={addStrategy} size="sm">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {strategies.length > 0 && (
                            <div className="space-y-2">
                                {strategies.map((strategy, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Badge variant="secondary" className="flex-1 justify-between">
                                            <span className="font-mono text-xs">{strategy}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-4 w-4 p-0 ml-2"
                                                onClick={() => removeStrategy(index)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                            Authorized strategy contracts that can borrow from the vault
                        </p>
                    </div>

                    <Separator />

                    {/* Vault Parameters */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Vault Parameters</h3>

                        <div className="space-y-2">
                            <Label htmlFor="lockTime">Lock Time (seconds)*</Label>
                            <Input
                                id="lockTime"
                                type="number"
                                placeholder="300"
                                value={lockTime}
                                onChange={(e) => setLockTime(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                Delay before redemptions can be executed (e.g., 300 = 5 minutes)
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="penaltyRate">Penalty Rate (%)*</Label>
                                <Input
                                    id="penaltyRate"
                                    type="number"
                                    placeholder="10"
                                    value={penaltyRate}
                                    onChange={(e) => setPenaltyRate(e.target.value)}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Penalty for emergency redemptions
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="minLiquidityRate">Min Liquidity Rate (%)*</Label>
                                <Input
                                    id="minLiquidityRate"
                                    type="number"
                                    placeholder="10"
                                    value={minLiquidityRate}
                                    onChange={(e) => setMinLiquidityRate(e.target.value)}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Minimum liquidity to maintain
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Deploy Button */}
                    <div className="space-y-4">
                        {!connected ? (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Please connect your wallet to deploy a vault
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Button
                                onClick={handleDeploy}
                                disabled={isTransacting || !tokenAddress || !name || !symbol}
                                className="w-full"
                            >
                                {isTransacting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deploying Vault...
                                    </>
                                ) : (
                                    'Deploy Vault'
                                )}
                            </Button>
                        )}

                        {/* Success Message */}
                        {deployedContractId && (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="space-y-2">
                                        <p>Vault deployed successfully!</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">Contract ID:</span>
                                            <code className="text-sm bg-muted px-2 py-1 rounded">
                                                {deployedContractId}
                                            </code>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}