'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
    StellarWalletsKit,
    WalletNetwork,
    ISupportedWallet,
    XBULL_ID,
    FreighterModule,
    xBullModule,
    LobstrModule,
    AlbedoModule,
    HanaModule
} from '@creit.tech/stellar-wallets-kit';
import {
    TransactionBuilder,
    BASE_FEE,
    rpc,
    xdr,
    Transaction
} from '@stellar/stellar-sdk';
import {
    NetworkConfig,
    TransactionResult,
    SimulationResult,
    TxStatus,
    sendTransaction,
    simulateTransaction,
    sendLaunchTube,
    TESTNET,
} from '@/lib/stellar';

interface WalletContextValue {
    // Network config
    network: NetworkConfig;

    // Wallet state
    connected: boolean;
    walletAddress: string;
    walletId: string | null;

    // Transaction state
    txStatus: TxStatus;
    txResult: TransactionResult | null;

    // Actions
    connect: () => Promise<boolean>;
    disconnect: () => void;
    setNetwork: (network: NetworkConfig) => void;
    clearTxStatus: () => void;
    submitTransaction: (operationXdr: string) => Promise<TransactionResult>;
    simulateTransaction: (operationXdr: string) => Promise<SimulationResult>;
}

interface WalletProviderProps {
    children: React.ReactNode;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: WalletProviderProps) {
    // State
    const [network, setNetwork] = useState<NetworkConfig>(TESTNET);
    const [kit, setKit] = useState<StellarWalletsKit | null>(null);
    const [connected, setConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [walletId, setWalletId] = useState<string | null>(null);
    const [txStatus, setTxStatus] = useState<TxStatus>(TxStatus.NONE);
    const [txResult, setTxResult] = useState<TransactionResult | null>(null);

    // Initialize wallet kit
    const initializeKit = useCallback(() => {
        const walletKit = new StellarWalletsKit({
            network: network.passphrase as WalletNetwork,
            selectedWalletId: walletId || XBULL_ID,
            modules: [
                new xBullModule(),
                new FreighterModule(),
                new LobstrModule(),
                new AlbedoModule(),
                new HanaModule(),
            ],
        });
        setKit(walletKit);
        return walletKit;
    }, [network, walletId]);

    // Initialize kit on mount and network change
    useEffect(() => {
        initializeKit();
    }, [initializeKit]);

    // Connect wallet
    const connect = useCallback(async (): Promise<boolean> => {
        try {
            let walletKit = kit;
            if (!walletKit) {
                walletKit = initializeKit();
            }

            let success = false;

            await walletKit.openModal({
                onWalletSelected: async (option: ISupportedWallet) => {
                    walletKit.setWallet(option.id);
                    setWalletId(option.id);

                    try {
                        const { address } = await walletKit.getAddress();
                        if (address) {
                            setWalletAddress(address);
                            setConnected(true);
                            success = true;
                            console.log('Wallet connected:', address);
                        }
                    } catch (error) {
                        console.error('Failed to get wallet address:', error);
                    }
                },
            });

            return success;
        } catch (error) {
            console.error('Unable to connect wallet:', error);
            return false;
        }
    }, [kit, initializeKit]);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        setConnected(false);
        setWalletAddress('');
        setWalletId(null);
        setTxStatus(TxStatus.NONE);
        setTxResult(null);
    }, []);

    // Clear transaction status
    const clearTxStatus = useCallback(() => {
        setTxStatus(TxStatus.NONE);
        setTxResult(null);
    }, []);

    // Simulate transaction
    const simulateTransactionFn = useCallback(async (operationXdr: string): Promise<SimulationResult> => {
        if (!walletAddress) {
            return {
                success: false,
                error: 'Wallet not connected',
            };
        }

        try {
            const server = new rpc.Server(network.rpc);
            const sourceAccount = await server.getAccount(walletAddress);

            // Build transaction from XDR
            const transaction = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: network.passphrase,
            })
                .addOperation(xdr.Operation.fromXDR(operationXdr, 'base64'))
                .setTimeout(300)
                .build();

            // Use the utility function
            return await simulateTransaction(server, transaction);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Simulation error',
            };
        }
    }, [network, walletAddress]);

    // Submit transaction
    const submitTransactionFn = useCallback(async (operationXdr: string): Promise<TransactionResult> => {
        if (!kit || !connected || !walletAddress) {
            const result = {
                success: false,
                error: 'Wallet not connected',
            };
            setTxResult(result);
            return result;
        }

        setTxStatus(TxStatus.BUILDING);
        setTxResult(null);

        try {
            const server = new rpc.Server(network.rpc);
            const sourceAccount = await server.getAccount(walletAddress);

            // Build transaction
            const transaction = new TransactionBuilder(sourceAccount, {
                fee: BASE_FEE,
                networkPassphrase: network.passphrase,
            })
                .addOperation(xdr.Operation.fromXDR(operationXdr, 'base64'))
                .setTimeout(300)
                .build();

            console.log('Submitting transaction:', transaction.toXDR());

            let result: TransactionResult;
            // Check if we should use LaunchTube
            if (network.useLaunchtube && network.launchtube && network.jwt) {
                setTxStatus(TxStatus.SIGNING);
                const { signedTxXdr } = await kit.signTransaction(transaction.toXDR());
                setTxStatus(TxStatus.SUBMITTING);
                result = await sendLaunchTube(signedTxXdr, BASE_FEE, network);
            } else {
                // Sign transaction
                const preparedTx = await server.prepareTransaction(transaction);

                setTxStatus(TxStatus.SIGNING);
                const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR(), {
                    networkPassphrase: network.passphrase,
                });

                // Submit transaction
                setTxStatus(TxStatus.SUBMITTING);
                result = await sendTransaction(server, new Transaction(signedTxXdr, network.passphrase));
            }

            if (result.success) {
                setTxStatus(TxStatus.SUCCESS);
                setTxResult(result);
            } else {
                setTxStatus(TxStatus.FAIL);
                setTxResult(result);
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
            const result = {
                success: false,
                error: errorMessage,
            };

            setTxStatus(TxStatus.FAIL);
            setTxResult(result);

            return result;
        }
    }, [kit, connected, walletAddress, network]);

    const contextValue: WalletContextValue = {
        network,
        connected,
        walletAddress,
        walletId,
        txStatus,
        txResult,
        connect,
        disconnect,
        setNetwork,
        clearTxStatus,
        submitTransaction: submitTransactionFn,
        simulateTransaction: simulateTransactionFn,
    };

    return (
        <WalletContext.Provider value={contextValue} >
            {children}
        </WalletContext.Provider>
    );
}

// Hook to use the wallet context
export function useWalletStore() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWalletStore must be used within WalletProvider');
    }
    return context;
}

// Convenience hooks (to match your existing API)
export const useWallet = () => {
    const context = useWalletStore();
    return {
        connected: context.connected,
        walletAddress: context.walletAddress,
        connect: context.connect,
        disconnect: context.disconnect,
        network: context.network,
        setNetwork: context.setNetwork,
    };
};

export const useTransaction = () => {
    const context = useWalletStore();
    return {
        txStatus: context.txStatus,
        txResult: context.txResult,
        clearTxStatus: context.clearTxStatus,
        submitTransaction: context.submitTransaction,
        simulateTransaction: context.simulateTransaction,
    };
};

export const useWalletAddress = () => {
    const context = useWalletStore();
    return context.walletAddress;
};

export const useIsConnected = () => {
    const context = useWalletStore();
    return context.connected;
};

export { TxStatus };