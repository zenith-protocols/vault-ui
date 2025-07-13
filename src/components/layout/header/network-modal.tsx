'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNetwork } from '@/hooks/use-wallet';
import { TESTNET, MAINNET } from '@/lib/stellar';
import { Globe, Info, Code } from 'lucide-react';
import type { NetworkConfig } from '@/lib/stellar/types';

interface NetworkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NetworkModal({ open, onOpenChange }: NetworkModalProps) {
    const {
        network,
        setNetwork,
        isLaunchtubeEnabled,
        enableLaunchtube,
        disableLaunchtube
    } = useNetwork();

    // Determine current network type
    const getCurrentNetworkType = () => {
        if (network.passphrase === TESTNET.passphrase) return 'testnet';
        if (network.passphrase === MAINNET.passphrase) return 'mainnet';
        return 'custom';
    };

    // Local state for form
    const [selectedNetwork, setSelectedNetwork] = useState(getCurrentNetworkType());
    const [customConfig, setCustomConfig] = useState<NetworkConfig>({
        rpc: network.rpc,
        horizon: network.horizon,
        passphrase: network.passphrase,
        explorer: network.explorer,
        launchtube: network.launchtube,
        useLaunchtube: false,
    });
    const [launchtubeEnabled, setLaunchtubeEnabled] = useState(isLaunchtubeEnabled);
    const [jwtToken, setJwtToken] = useState(network.jwt || '');
    const [showConfig, setShowConfig] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            setSelectedNetwork(getCurrentNetworkType());
            setCustomConfig({
                rpc: network.rpc,
                horizon: network.horizon,
                passphrase: network.passphrase,
                explorer: network.explorer,
                launchtube: network.launchtube,
                useLaunchtube: false,
            });
            setLaunchtubeEnabled(isLaunchtubeEnabled);
            setJwtToken(network.jwt || '');
            setShowConfig(false);
        }
    }, [open, network, isLaunchtubeEnabled]);

    const handleSave = () => {
        let newNetwork: NetworkConfig;

        // Determine which network to use
        switch (selectedNetwork) {
            case 'testnet':
                newNetwork = { ...TESTNET };
                break;
            case 'mainnet':
                newNetwork = { ...MAINNET };
                break;
            case 'custom':
                newNetwork = { ...customConfig };
                break;
            default:
                return;
        }

        // Apply LaunchTube settings
        if (launchtubeEnabled && jwtToken) {
            newNetwork.useLaunchtube = true;
            newNetwork.jwt = jwtToken;
        } else {
            newNetwork.useLaunchtube = false;
            newNetwork.jwt = undefined;
        }

        setNetwork(newNetwork);
        onOpenChange(false);
    };

    const handleCancel = () => {
        onOpenChange(false);
    };

    // Current configuration display
    const currentConfigDisplay = JSON.stringify({
        ...network,
        jwt: network.jwt ? '***' : undefined
    }, null, 2);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Network Settings</DialogTitle>
                    <DialogDescription>
                        Configure your network preferences and RPC settings.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6 py-4">
                        {/* Network Selection */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Network
                            </Label>
                            <RadioGroup
                                value={selectedNetwork}
                                onValueChange={setSelectedNetwork}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="testnet" id="testnet" />
                                    <Label htmlFor="testnet" className="font-normal cursor-pointer">
                                        Testnet (Test Network)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mainnet" id="mainnet" />
                                    <Label htmlFor="mainnet" className="font-normal cursor-pointer">
                                        Mainnet (Public Network)
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="custom" id="custom" />
                                    <Label htmlFor="custom" className="font-normal cursor-pointer">
                                        Custom
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Custom Network Settings */}
                        {selectedNetwork === 'custom' && (
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                <h4 className="text-sm font-medium">Custom Network Configuration</h4>

                                <div className="space-y-2">
                                    <Label htmlFor="rpc">RPC URL</Label>
                                    <Input
                                        id="rpc"
                                        value={customConfig.rpc}
                                        onChange={(e) => setCustomConfig({
                                            ...customConfig,
                                            rpc: e.target.value
                                        })}
                                        placeholder="https://soroban-rpc.example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="horizon">Horizon URL</Label>
                                    <Input
                                        id="horizon"
                                        value={customConfig.horizon}
                                        onChange={(e) => setCustomConfig({
                                            ...customConfig,
                                            horizon: e.target.value
                                        })}
                                        placeholder="https://horizon.example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="passphrase">Network Passphrase</Label>
                                    <Input
                                        id="passphrase"
                                        value={customConfig.passphrase}
                                        onChange={(e) => setCustomConfig({
                                            ...customConfig,
                                            passphrase: e.target.value
                                        })}
                                        placeholder="Custom Network ; January 2025"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="explorer">Explorer URL</Label>
                                    <Input
                                        id="explorer"
                                        value={customConfig.explorer}
                                        onChange={(e) => setCustomConfig({
                                            ...customConfig,
                                            explorer: e.target.value
                                        })}
                                        placeholder="https://explorer.example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="launchtube-url">LaunchTube URL</Label>
                                    <Input
                                        id="launchtube-url"
                                        value={customConfig.launchtube}
                                        onChange={(e) => setCustomConfig({
                                            ...customConfig,
                                            launchtube: e.target.value
                                        })}
                                        placeholder="https://launchtube.example.com/api/v1"
                                    />
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* LaunchTube Settings */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="launchtube" className="text-base">LaunchTube</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable sponsored transactions
                                    </p>
                                </div>
                                <Switch
                                    id="launchtube"
                                    checked={launchtubeEnabled}
                                    onCheckedChange={setLaunchtubeEnabled}
                                />
                            </div>

                            {launchtubeEnabled && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        <strong>JWT (JSON Web Token)</strong> is a secure token that authenticates
                                        your application with LaunchTube service for sponsored transactions.
                                        It allows your app to submit transactions without requiring users to pay fees.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {launchtubeEnabled && (
                                <div className="space-y-2">
                                    <Label htmlFor="jwt">JWT Token</Label>
                                    <Input
                                        id="jwt"
                                        type="password"
                                        placeholder="Enter your JWT token"
                                        value={jwtToken}
                                        onChange={(e) => setJwtToken(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Current Configuration */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <Code className="h-4 w-4" />
                                    Current Configuration
                                </Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowConfig(!showConfig)}
                                >
                                    {showConfig ? 'Hide' : 'Show'}
                                </Button>
                            </div>

                            {showConfig && (
                                <div className="rounded-lg bg-muted p-3 font-mono text-xs overflow-x-auto">
                                    <pre>{currentConfigDisplay}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}