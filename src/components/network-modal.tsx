// src/components/network-modal.tsx
'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletStore } from '@/stores/wallet-store';
import { TESTNET, MAINNET } from '@/lib/stellar/constants';
import { useState, useEffect } from 'react';
import { AlertCircle, Globe, TestTube, Server } from 'lucide-react';

interface NetworkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const NETWORK_OPTIONS = {
    testnet: {
        config: TESTNET,
        displayName: 'Stellar Testnet',
        icon: TestTube,
    },
    mainnet: {
        config: MAINNET,
        displayName: 'Stellar Mainnet',
        icon: Globe,
    },
    custom: {
        displayName: 'Custom Network',
        icon: Server,
    },
};

export function NetworkModal({ open, onOpenChange }: NetworkModalProps) {
    const { network, setNetwork } = useWalletStore(state => ({
        network: state.network,
        setNetwork: state.setNetwork
    }));

    const [selectedNetwork, setSelectedNetwork] = useState<string>('testnet');
    const [customRpc, setCustomRpc] = useState('');
    const [customHorizon, setCustomHorizon] = useState('');
    const [customPassphrase, setCustomPassphrase] = useState('');

    useEffect(() => {
        // Determine current network based on passphrase
        if (network.passphrase === TESTNET.passphrase) {
            setSelectedNetwork('testnet');
        } else if (network.passphrase === MAINNET.passphrase) {
            setSelectedNetwork('mainnet');
        } else {
            setSelectedNetwork('custom');
            setCustomRpc(network.rpc);
            setCustomHorizon(network.horizon);
            setCustomPassphrase(network.passphrase);
        }
    }, [network]);

    const handleSave = () => {
        if (selectedNetwork === 'custom') {
            if (!customRpc || !customHorizon || !customPassphrase) {
                return;
            }
            setNetwork({
                passphrase: customPassphrase,
                rpc: customRpc,
                horizon: customHorizon,
                explorer: 'https://stellar.expert/explorer/custom',
                launchtube: '',
                useLaunchtube: false,
            });
        } else if (selectedNetwork === 'testnet') {
            setNetwork(TESTNET);
        } else if (selectedNetwork === 'mainnet') {
            setNetwork(MAINNET);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Network Settings</DialogTitle>
                    <DialogDescription>
                        Select the Stellar network to connect to
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <RadioGroup value={selectedNetwork} onValueChange={setSelectedNetwork}>
                        <div className="space-y-3">
                            {Object.entries(NETWORK_OPTIONS).map(([key, option]) => {
                                const Icon = option.icon;
                                return (
                                    <div key={key} className="flex items-start space-x-3">
                                        <RadioGroupItem value={key} id={key} className="mt-1" />
                                        <Label
                                            htmlFor={key}
                                            className="flex-1 cursor-pointer space-y-1"
                                        >
                                            <div className="flex items-center gap-2 font-medium">
                                                <Icon className="h-4 w-4" />
                                                {option.displayName}
                                            </div>
                                            {key !== 'custom' && 'config' in option && (
                                                <div className="text-sm text-muted-foreground">
                                                    {option.config.rpc}
                                                </div>
                                            )}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                    </RadioGroup>

                    {selectedNetwork === 'custom' && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <div className="space-y-2">
                                <Label htmlFor="custom-rpc">Soroban RPC URL</Label>
                                <Input
                                    id="custom-rpc"
                                    placeholder="https://soroban-custom.stellar.org"
                                    value={customRpc}
                                    onChange={(e) => setCustomRpc(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custom-horizon">Horizon URL</Label>
                                <Input
                                    id="custom-horizon"
                                    placeholder="https://horizon-custom.stellar.org"
                                    value={customHorizon}
                                    onChange={(e) => setCustomHorizon(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custom-passphrase">Network Passphrase</Label>
                                <Input
                                    id="custom-passphrase"
                                    placeholder="Custom Network ; Month Year"
                                    value={customPassphrase}
                                    onChange={(e) => setCustomPassphrase(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Changing networks will disconnect your wallet. You'll need to reconnect after switching.
                        </AlertDescription>
                    </Alert>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={
                            selectedNetwork === 'custom' &&
                            (!customRpc || !customHorizon || !customPassphrase)
                        }
                    >
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}