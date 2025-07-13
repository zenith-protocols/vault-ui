// src/lib/stellar/constants.ts
import type { NetworkConfig } from './types';

// Network Configurations
export const TESTNET: NetworkConfig = {
    rpc: 'https://soroban-testnet.stellar.org',
    horizon: 'https://horizon-testnet.stellar.org',
    passphrase: 'Test SDF Network ; September 2015',
    explorer: 'https://stellar.expert/explorer/testnet',
    launchtube: 'https://launchtube.stellar.org/api/v1',
    useLaunchtube: false,
};

export const MAINNET: NetworkConfig = {
    rpc: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
    horizon: 'https://horizon.stellar.org',
    passphrase: 'Public Global Stellar Network ; September 2015',
    explorer: 'https://stellar.expert/explorer/public',
    launchtube: 'https://launchtube.stellar.org/api/v1',
    useLaunchtube: false,
};

// Transaction Settings
export const TX_SETTINGS = {
    BASE_FEE: '100000', // 0.01 XLM in stroops
    TIMEOUT: 300, // 5 minutes
    MIN_ACCOUNT_BALANCE: '1', // 1 XLM
} as const;