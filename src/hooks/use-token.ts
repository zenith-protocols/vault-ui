// src/hooks/use-token.ts
import { useQuery } from '@tanstack/react-query';
import { getTokenBalance, TokenMetadata } from '@zenith-protocols/zenex-sdk';
import type { Network } from '@zenith-protocols/zenex-sdk';

export interface TokenBalanceResult {
    balance: string;
    hasTrustline: boolean;
}

// Token balance hook with trustline detection
export function useTokenBalance(
    network: Network,
    tokenId: string,
    address: string,
    decimals = 7
) {
    return useQuery<TokenBalanceResult>({
        queryKey: ['token-balance', tokenId, address, network.rpc],
        queryFn: async (): Promise<TokenBalanceResult> => {
            if (!address || !tokenId) {
                return { balance: '0', hasTrustline: false };
            }

            const balance = await getTokenBalance(network, tokenId, address);

            if (balance === null) {
                return { balance: '0', hasTrustline: false };
            }

            return {
                balance: String(balance),
                hasTrustline: true
            };
        },
        enabled: !!address && !!tokenId,
        refetchInterval: 30_000, // 30 seconds
        staleTime: 10_000, // 10 seconds
    });
}

// Token metadata hook
export function useTokenMetadata(
    network: Network,
    tokenId: string
) {
    return useQuery<TokenMetadata>({
        queryKey: ['token-metadata', tokenId, network.rpc],
        queryFn: () => TokenMetadata.load(network, tokenId),
        enabled: !!tokenId,
        staleTime: Infinity, // Metadata rarely changes
        gcTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    });
}