'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    CheckCircle,
    XCircle,
    Copy,
    ExternalLink,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { useWalletStore, TxStatus } from '@/stores/wallet-store';

export function TransactionOverlay() {
    const [isOpen, setIsOpen] = useState(false);

    // Direct store access without hooks
    const txStatus = useWalletStore((state) => state.txStatus);
    const txResult = useWalletStore((state) => state.txResult);
    const clearTxStatus = useWalletStore((state) => state.clearTxStatus);
    const network = useWalletStore((state) => state.network);

    const txHash = txResult?.hash;
    const error = txResult?.error;

    // Get explorer URL from network config
    const explorerUrl = `${network.explorer}/tx/`;

    // Automatically open when transaction starts
    useEffect(() => {
        if (txStatus !== TxStatus.NONE) {
            setIsOpen(true);
        }
    }, [txStatus]);

    // Format transaction hash for display
    const formatTxHash = (hash: string) => {
        if (hash.length <= 16) return hash;
        return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
    };

    const handleCopy = () => {
        if (txHash) {
            navigator.clipboard.writeText(txHash);
            toast.success('Transaction hash copied!');
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        // Clear transaction status after closing animation
        setTimeout(() => {
            clearTxStatus();
        }, 300);
    };

    const handleReturn = () => {
        // If transaction is in progress, just minimize the dialog
        if (txStatus === TxStatus.SIGNING || txStatus === TxStatus.SUBMITTING) {
            setIsOpen(false);
            // Don't clear the transaction status, so it can reopen when done
        } else {
            // If transaction is complete, close and clear
            handleClose();
        }
    };

    const canClose = txStatus === TxStatus.SUCCESS || txStatus === TxStatus.FAIL || txStatus === TxStatus.NONE;

    // Don't render dialog if no transaction
    if (txStatus === TxStatus.NONE) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={canClose ? handleClose : undefined}>
            <DialogContent
                className="sm:max-w-md"
                showCloseButton={canClose}
                onInteractOutside={(e) => {
                    if (!canClose) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle>Transaction Status</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Loading States */}
                    {(txStatus === TxStatus.SIGNING || txStatus === TxStatus.SUBMITTING) && (
                        <div className="flex flex-col items-center space-y-4 py-6">
                            <div className="relative">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="font-semibold">
                                    {txStatus === TxStatus.SIGNING ? 'Signing Transaction' : 'Submitting Transaction'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {txStatus === TxStatus.SIGNING
                                        ? 'Please confirm the transaction in your wallet...'
                                        : 'Broadcasting transaction to the network...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {txStatus === TxStatus.SUCCESS && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center space-y-4 py-6">
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="font-semibold">Transaction Successful!</p>
                                    <p className="text-sm text-muted-foreground">
                                        Your transaction has been confirmed on the network.
                                    </p>
                                </div>
                            </div>

                            {txHash && (
                                <>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Transaction Hash</Label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">
                                                    {formatTxHash(txHash)}
                                                </code>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleCopy}
                                                    className="shrink-0"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    <span className="sr-only">Copy transaction hash</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => window.open(`${explorerUrl}${txHash}`, '_blank')}
                                                    className="shrink-0"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    <span className="sr-only">View in Explorer</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Error State */}
                    {txStatus === TxStatus.FAIL && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center space-y-4 py-6">
                                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="font-semibold">Transaction Failed</p>
                                    <p className="text-sm text-muted-foreground">
                                        The transaction could not be completed.
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <>
                                    <Separator />
                                    <Alert variant="destructive">
                                        <AlertDescription className="break-words">
                                            {error}
                                        </AlertDescription>
                                    </Alert>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <Separator />
                <div className="flex justify-center p-2">
                    <Button
                        onClick={handleReturn}
                        variant="outline"
                        size="lg"
                        className="w-full max-w-xs"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}