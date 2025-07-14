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
        config: null,  // Add this to fix the TypeScript error
        displayName: 'Custom Network',
        icon: Server,
    },
};

export function NetworkModal({ open, onOpenChange }: NetworkModalProps) {
    // Change: Direct access to context values
    const { network, setNetwork } = useWalletStore();

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
            setCustomRpc(network.rpc || '');
            setCustomHorizon(network.horizon || '');
            setCustomPassphrase(network.passphrase);
        }
    }, [network]);

    const handleSave = () => {
        if (selectedNetwork === 'custom') {
            if (!customRpc || !customHorizon || !customPassphrase) {
                return; // Don't save if custom fields are empty
            }

            setNetwork({
                rpc: customRpc,
                horizon: customHorizon,
                passphrase: customPassphrase,
                explorer: 'https://stellar.expert/explorer/public',
            });
        } else {
            setNetwork(NETWORK_OPTIONS[selectedNetwork as 'testnet' | 'mainnet'].config);
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Network Settings</DialogTitle>
                    <DialogDescription>
                        Choose which Stellar network to connect to
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <RadioGroup value={selectedNetwork} onValueChange={setSelectedNetwork}>
                        {Object.entries(NETWORK_OPTIONS).map(([key, option]) => {
                            const Icon = option.icon;
                            return (
                                <div key={key} className="flex items-center space-x-2">
                                    <RadioGroupItem value={key} id={key} />
                                    <Label
                                        htmlFor={key}
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                    >
                                        <Icon className="h-4 w-4" />
                                        {option.displayName}
                                    </Label>
                                </div>
                            );
                        })}
                    </RadioGroup>

                    {selectedNetwork === 'custom' && (
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="rpc">RPC URL</Label>
                                <Input
                                    id="rpc"
                                    placeholder="https://soroban-rpc.stellar.org"
                                    value={customRpc}
                                    onChange={(e) => setCustomRpc(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="horizon">Horizon URL</Label>
                                <Input
                                    id="horizon"
                                    placeholder="https://horizon.stellar.org"
                                    value={customHorizon}
                                    onChange={(e) => setCustomHorizon(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="passphrase">Network Passphrase</Label>
                                <Input
                                    id="passphrase"
                                    placeholder="Public Global Stellar Network ; September 2015"
                                    value={customPassphrase}
                                    onChange={(e) => setCustomPassphrase(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {selectedNetwork === 'mainnet' && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                You are about to switch to Mainnet. Real assets will be used.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}