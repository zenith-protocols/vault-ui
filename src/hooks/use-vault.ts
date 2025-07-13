import { useQuery } from '@tanstack/react-query';
import {
    VaultState,
    VaultWithdrawal,
} from '@zenith-protocols/zenex-sdk';
import type { Network } from '@zenith-protocols/zenex-sdk';

export function useVaultState(
    network: Network,
    vaultId: string,
    tokenId: string
) {
    return useQuery<VaultState>({
        queryKey: ['vault-state', vaultId, tokenId, network.rpc],
        queryFn: () => VaultState.load(network, vaultId, tokenId),
        enabled: !!vaultId && !!tokenId,
        refetchInterval: 60_000, // 1 minute
        staleTime: 30_000, // 30 seconds
    });
}

export function useVaultWithdrawal(
    network: Network,
    vaultId: string,
    userId: string
) {
    return useQuery<VaultWithdrawal | null>({
        queryKey: ['vault-withdrawal', vaultId, userId, network.rpc],
        queryFn: () => loadVaultWithdrawal(network, vaultId, userId),
        enabled: !!vaultId && !!userId,
        refetchInterval: 60_000, // 1 minute
        staleTime: 30_000, // 30 seconds
    });
}

/**
 * Hook to fetch strategy P&L data for a vault
 */
export function useVaultStrategies(
    network: Network,
    vaultId: string
) {
    // First get the vault state to know which strategies exist
    const { data: vaultState } = useVaultState(network, vaultId, '');

    return useQuery<Record<string, number>>({
        queryKey: ['vault-strategies-impact', vaultId, vaultState?.strategies, network.rpc],
        queryFn: async () => {
            if (!vaultState || !vaultState.strategies || vaultState.strategies.length === 0) {
                return {};
            }

            return loadVaultStrategiesImpact(network, vaultId, vaultState.strategies);
        },
        enabled: !!vaultId && !!vaultState && vaultState.strategies.length > 0,
        refetchInterval: 60_000, // 1 minute
        staleTime: 30_000, // 30 seconds
    });
}