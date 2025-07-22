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

    // Change: Direct access to context values
    const { txStatus, txResult, clearTxStatus, network } = useWalletStore();

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
            <DialogContent className="sm:max-w-md" showCloseButton={true}>
                <DialogHeader>
                    <DialogTitle>
                        {txStatus === TxStatus.SIGNING && 'Sign Transaction'}
                        {txStatus === TxStatus.SUBMITTING && 'Submitting Transaction'}
                        {txStatus === TxStatus.SUCCESS && 'Transaction Successful'}
                        {txStatus === TxStatus.FAIL && 'Transaction Failed'}
                        {txStatus === TxStatus.BUILDING && 'Preparing Transaction'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Status Display */}
                    <div className="flex flex-col items-center justify-center py-6">
                        {txStatus === TxStatus.SIGNING && (
                            <>
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Please sign the transaction in your wallet
                                </p>
                            </>
                        )}

                        {txStatus === TxStatus.SUBMITTING && (
                            <>
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Submitting transaction to the network...
                                </p>
                            </>
                        )}

                        {txStatus === TxStatus.SUCCESS && (
                            <>
                                <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Your transaction has been confirmed
                                </p>
                            </>
                        )}

                        {txStatus === TxStatus.FAIL && (
                            <>
                                <XCircle className="h-12 w-12 text-destructive mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Transaction failed
                                </p>
                            </>
                        )}

                        {txStatus === TxStatus.BUILDING && (
                            <>
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Building transaction...
                                </p>
                            </>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Transaction Hash */}
                    {txHash && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label>Transaction Hash</Label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 text-xs bg-muted rounded">
                                        {formatTxHash(txHash)}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={handleCopy}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        asChild
                                    >
                                        <a
                                            href={`${explorerUrl}${txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
}