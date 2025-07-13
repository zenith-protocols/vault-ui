import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletStore, TxStatus } from '@/stores/wallet-store';
import { TESTNET, MAINNET } from '@/lib/stellar';

// Main wallet hook
export function useWallet() {
    const store = useWalletStore();
    const queryClient = useQueryClient();

    // Initialize kit on mount
    useEffect(() => {
        store.initializeKit();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Invalidate queries on successful transaction
    useEffect(() => {
        if (store.txStatus === TxStatus.SUCCESS && store.walletAddress) {
            // Invalidate all queries that might be affected by a transaction
            queryClient.invalidateQueries({ queryKey: ['token-balance'] });
            queryClient.invalidateQueries({ queryKey: ['vault'] });
            queryClient.invalidateQueries({ queryKey: ['trading'] });
        }
    }, [store.txStatus, store.walletAddress, queryClient]);

    return {
        // Connection state
        connected: store.connected,
        walletAddress: store.walletAddress,

        // Actions
        connect: store.connect,
        disconnect: store.disconnect,

        // Transaction
        submitTransaction: store.submitTransaction,
        simulateTransaction: store.simulateTransaction,

        // Computed
        shortAddress: store.walletAddress
            ? `${store.walletAddress.slice(0, 4)}...${store.walletAddress.slice(-4)}`
            : null,
    };
}

// Network configuration hook
export function useNetwork() {
    const network = useWalletStore((state) => state.network);
    const setNetwork = useWalletStore((state) => state.setNetwork);

    const setTestnet = () => setNetwork(TESTNET);
    const setMainnet = () => setNetwork(MAINNET);

    const enableLaunchtube = (jwt: string) => {
        setNetwork({
            ...network,
            useLaunchtube: true,
            jwt,
        });
    };

    const disableLaunchtube = () => {
        setNetwork({
            ...network,
            useLaunchtube: false,
            jwt: undefined,
        });
    };

    return {
        network,
        setNetwork,
        setTestnet,
        setMainnet,
        enableLaunchtube,
        disableLaunchtube,
        isTestnet: network.passphrase.includes('Test'),
        isMainnet: network.passphrase.includes('Public'),
        isLaunchtubeEnabled: network.useLaunchtube || false,
    };
}

// Transaction status hook
export function useTransaction() {
    const store = useWalletStore();

    return {
        txStatus: store.txStatus,
        txResult: store.txResult,

        clearTxStatus: store.clearTxStatus,
        submitTransaction: store.submitTransaction,
        simulateTransaction: store.simulateTransaction,

        isTransacting: [
            TxStatus.BUILDING,
            TxStatus.SIGNING,
            TxStatus.SUBMITTING
        ].includes(store.txStatus),
    };
}

// Convenience selectors
export const useWalletAddress = () => useWalletStore((state) => state.walletAddress);
export const useIsConnected = () => useWalletStore((state) => state.connected);