'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useWalletStore } from '@/stores/wallet-store';
import { NetworkModal } from './network-modal';
import { DeployModal } from './deploy-modal';
import { toast } from 'sonner';
import {
    Settings,
    Copy,
    LogOut,
    Wallet as WalletIcon,
    Check,
    Plus,
    Rocket
} from 'lucide-react';

export function Header() {
    const {
        connected,
        walletAddress,
        connect,
        disconnect,
        network
    } = useWalletStore(state => ({
        connected: state.connected,
        walletAddress: state.walletAddress,
        connect: state.connect,
        disconnect: state.disconnect,
        network: state.network
    }));

    const [copied, setCopied] = useState(false);
    const [networkModalOpen, setNetworkModalOpen] = useState(false);
    const [deployModalOpen, setDeployModalOpen] = useState(false);

    const isTestnet = network.passphrase.includes('Test');
    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
        : '';

    const handleCopyAddress = async () => {
        if (walletAddress) {
            await navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Address copied to clipboard');
        }
    };

    return (
        <>
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    {/* Left side - Branding */}
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Rocket className="h-5 w-5" />
                            Vault UI
                        </h1>

                        {/* Network Badge */}
                        <Badge
                            variant={isTestnet ? "secondary" : "default"}
                            className="font-mono text-xs"
                        >
                            {isTestnet ? "Testnet" : "Mainnet"}
                        </Badge>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex items-center gap-3">
                        {/* Deploy Button - Always visible */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeployModalOpen(true)}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Deploy Vault
                        </Button>

                        {/* Wallet Section */}
                        {!connected ? (
                            <div className="flex items-center gap-2">
                                <Button onClick={connect} size="sm">
                                    <WalletIcon className="mr-2 h-4 w-4" />
                                    Connect Wallet
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setNetworkModalOpen(true)}
                                    className="h-9 w-9"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Wallet Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <WalletIcon className="h-4 w-4" />
                                            <span className="font-mono">{shortAddress}</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <div className="px-2 py-1.5">
                                            <p className="text-sm font-medium">Connected Wallet</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {walletAddress}
                                            </p>
                                        </div>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleCopyAddress}>
                                            {copied ? (
                                                <Check className="mr-2 h-4 w-4" />
                                            ) : (
                                                <Copy className="mr-2 h-4 w-4" />
                                            )}
                                            Copy Address
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setNetworkModalOpen(true)}>
                                            <Settings className="mr-2 h-4 w-4" />
                                            Network Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={disconnect}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Disconnect
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Modals */}
            <NetworkModal open={networkModalOpen} onOpenChange={setNetworkModalOpen} />
            <DeployModal open={deployModalOpen} onOpenChange={setDeployModalOpen} />
        </>
    );
}