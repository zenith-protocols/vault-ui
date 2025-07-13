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
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet, useNetwork } from '@/hooks/use-wallet';
import { useContracts } from '@/hooks/use-contracts';
import { useTokenBalance } from '@/hooks/use-token';
import { NetworkModal } from './network-modal';
import { toast } from 'sonner';
import {
    Settings,
    Copy,
    LogOut,
    Wallet as WalletIcon,
    Check,
    DollarSign
} from 'lucide-react';

export function Wallet() {
    const { connected, walletAddress, connect, disconnect } = useWallet();
    const { network } = useNetwork();
    const contracts = useContracts();
    const [copied, setCopied] = useState(false);
    const [networkModalOpen, setNetworkModalOpen] = useState(false);

    // Get token balance
    const { data: tokenData, isLoading: isLoadingToken } = useTokenBalance(
        network,
        contracts.token,
        walletAddress || '',
        7
    );

    const tokenBalance = tokenData?.balance || '0';
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

    // Format token balance
    const formattedBalance = tokenBalance
        ? parseFloat(tokenBalance).toFixed(2)
        : '0.00';

    // Common button styles for consistency
    const buttonStyles = "h-10 px-3 gap-2";

    return (
        <>
            {!connected ? (
                <div className="flex items-center gap-2">
                    <Button onClick={connect} variant="default">
                        <WalletIcon className="mr-2 h-4 w-4" />
                        Connect Wallet
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setNetworkModalOpen(true)}
                        className="h-10 w-10"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    {/* Balance Button */}
                    <Button
                        variant="outline"
                        className={`${buttonStyles} cursor-default hover:bg-transparent hover:text-current`}
                    >
                        <DollarSign className="h-4 w-4" />
                        {isLoadingToken ? (
                            <Skeleton className="h-4 w-16" />
                        ) : (
                            <span>
                                {formattedBalance} {process.env.NEXT_PUBLIC_TOKEN_ASSET}
                            </span>
                        )}
                    </Button>

                    {/* Wallet Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={buttonStyles}>
                                <WalletIcon className="h-4 w-4" />
                                <span>{shortAddress}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {/* Copy Address */}
                            <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
                                {copied ? (
                                    <Check className="mr-2 h-4 w-4" />
                                ) : (
                                    <Copy className="mr-2 h-4 w-4" />
                                )}
                                Copy Address
                            </DropdownMenuItem>

                            {/* Mobile Balance Display */}
                            <div className="sm:hidden px-2 py-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Balance</span>
                                    <span className="font-medium">
                                        {isLoadingToken ? (
                                            <Skeleton className="h-4 w-16" />
                                        ) : (
                                            `${formattedBalance} ${process.env.NEXT_PUBLIC_TOKEN_ASSET}`
                                        )}
                                    </span>
                                </div>
                            </div>

                            <DropdownMenuSeparator />

                            {/* Disconnect */}
                            <DropdownMenuItem onClick={disconnect} className="cursor-pointer text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                Disconnect
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings Button */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setNetworkModalOpen(true)}
                        className="h-10 w-10"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Network Modal */}
            <NetworkModal
                open={networkModalOpen}
                onOpenChange={setNetworkModalOpen}
            />
        </>
    );
}