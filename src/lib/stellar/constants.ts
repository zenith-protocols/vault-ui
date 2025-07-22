import type { NetworkConfig } from './types';

export const VAULT_CONTRACT_ID = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const WASM_HASHES = {
    testnet: {
        vault: 'b187ad02b18afdabedbacb8b46ad2fb8cf388b4f758a93517fec11ef4d83e23c',
        token: '53334e8121c2de966aa6e92dc3cc85ddc1aa8a2e8e751ce84841691bc5fcad73',
    },
    mainnet: {
        vault: 'YOUR_MAINNET_VAULT_WASM_HASH',
        token: 'YOUR_MAINNET_TOKEN_WASM_HASH',
    },
} as const;

// Network Configurations
export const TESTNET: NetworkConfig = {
    rpc: 'https://soroban-testnet.stellar.org',
    horizon: 'https://horizon-testnet.stellar.org',
    passphrase: 'Test SDF Network ; September 2015',
    explorer: 'https://stellar.expert/explorer/testnet',
};

export const MAINNET: NetworkConfig = {
    rpc: 'https://mainnet.sorobanrpc.com',
    horizon: 'https://horizon.stellar.org',
    passphrase: 'Public Global Stellar Network ; September 2015',
    explorer: 'https://stellar.expert/explorer/public',
};

// Transaction Settings
export const TX_SETTINGS = {
    BASE_FEE: '100000', // 0.01 XLM in stroops
    TIMEOUT: 300, // 5 minutes
    MIN_ACCOUNT_BALANCE: '1', // 1 XLM
} as const;