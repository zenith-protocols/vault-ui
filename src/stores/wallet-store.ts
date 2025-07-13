import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
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

interface WalletState {
    // Network config
    network: NetworkConfig;

    // Wallet state
    kit: StellarWalletsKit | null;
    connected: boolean;
    walletAddress: string;
    walletId: string | null;

    // Transaction state
    txStatus: TxStatus;
    txResult: TransactionResult | null;

    // Actions
    initializeKit: () => void;
    connect: () => Promise<boolean>;
    disconnect: () => void;
    setNetwork: (network: NetworkConfig) => void;
    clearTxStatus: () => void;
    submitTransaction: (operationXdr: string) => Promise<TransactionResult>;
    simulateTransaction: (operationXdr: string) => Promise<SimulationResult>;
}

export const useWalletStore = create<WalletState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                network: TESTNET,
                kit: null,
                connected: false,
                walletAddress: '',
                walletId: null,
                txStatus: TxStatus.NONE,
                txResult: null,

                // Initialize the wallet kit
                initializeKit: () => {
                    const { network, walletId } = get();

                    const kit = new StellarWalletsKit({
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

                    set({ kit });
                },

                // Connect wallet
                connect: async (): Promise<boolean> => {
                    try {
                        let kit = get().kit;

                        // Initialize kit if not already done
                        if (!kit) {
                            get().initializeKit();
                            kit = get().kit!;
                        }

                        let success = false;

                        await kit.openModal({
                            onWalletSelected: async (option: ISupportedWallet) => {
                                kit!.setWallet(option.id);
                                set({ walletId: option.id });

                                try {
                                    const { address } = await kit!.getAddress();
                                    if (address) {
                                        set({
                                            walletAddress: address,
                                            connected: true,
                                        });
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
                },

                // Disconnect wallet
                disconnect: () => {
                    set({
                        connected: false,
                        walletAddress: '',
                        walletId: null,
                        txStatus: TxStatus.NONE,
                        txResult: null,
                    });
                },

                // Set network configuration
                setNetwork: (network: NetworkConfig) => {
                    set({ network });

                    // Reinitialize kit with new network if connected
                    if (get().connected) {
                        get().initializeKit();
                    }
                },

                // Clear transaction status
                clearTxStatus: () => {
                    set({
                        txStatus: TxStatus.NONE,
                        txResult: null,
                    });
                },

                // Simulate transaction
                simulateTransaction: async (operationXdr: string): Promise<SimulationResult> => {
                    const { network, walletAddress } = get();

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
                },

                // Submit transaction
                submitTransaction: async (operationXdr: string): Promise<TransactionResult> => {
                    const { kit, network, walletAddress, connected } = get();

                    if (!kit || !connected || !walletAddress) {
                        const result = {
                            success: false,
                            error: 'Wallet not connected',
                        };
                        set({ txResult: result });
                        return result;
                    }

                    set({
                        txStatus: TxStatus.BUILDING,
                        txResult: null,
                    });

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
                            set({ txStatus: TxStatus.SIGNING });
                            const { signedTxXdr } = await kit.signTransaction(transaction.toXDR());
                            set({ txStatus: TxStatus.SUBMITTING });
                            result = await sendLaunchTube(signedTxXdr, BASE_FEE, network);
                        } else {
                            // Sign transaction
                            const preparedTx = await server.prepareTransaction(transaction);

                            set({ txStatus: TxStatus.SIGNING });
                            const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR(), {
                                networkPassphrase: network.passphrase,
                            });

                            // Submit transaction
                            set({ txStatus: TxStatus.SUBMITTING });
                            result = await sendTransaction(server, new Transaction(signedTxXdr, network.passphrase));
                        }

                        if (result.success) {
                            set({
                                txStatus: TxStatus.SUCCESS,
                                txResult: result,
                            });
                        } else {
                            set({
                                txStatus: TxStatus.FAIL,
                                txResult: result,
                            });
                        }

                        return result;
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
                        const result = {
                            success: false,
                            error: errorMessage,
                        };

                        set({
                            txStatus: TxStatus.FAIL,
                            txResult: result,
                        });

                        return result;
                    }
                },
            }),
            {
                name: 'zenex-wallet-storage',
                partialize: (state) => ({
                    // Persist these fields
                    network: state.network,
                    walletId: state.walletId,
                }),
                onRehydrateStorage: () => (state) => {
                    // After rehydration, initialize kit
                    if (state) {
                        state.initializeKit();
                        // Don't auto-reconnect, let user manually connect
                        state.connected = false;
                    }
                },
            }
        ),
        {
            name: 'zenex-wallet-store',
        }
    )
);

// Convenience hooks
export const useWallet = () => useWalletStore((state) => ({
    connected: state.connected,
    walletAddress: state.walletAddress,
    connect: state.connect,
    disconnect: state.disconnect,
    network: state.network,
    setNetwork: state.setNetwork,
}));

export const useTransaction = () => useWalletStore((state) => ({
    txStatus: state.txStatus,
    txResult: state.txResult,
    clearTxStatus: state.clearTxStatus,
    submitTransaction: state.submitTransaction,
    simulateTransaction: state.simulateTransaction,
}));

export const useWalletAddress = () => useWalletStore((state) => state.walletAddress);
export const useIsConnected = () => useWalletStore((state) => state.connected);

export { TxStatus };
