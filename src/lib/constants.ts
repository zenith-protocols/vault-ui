// WASM hashes for deployment
export const WASM_HASHES = {
    testnet: {
        vault: 'YOUR_TESTNET_VAULT_WASM_HASH',
        token: 'YOUR_TESTNET_TOKEN_WASM_HASH',
    },
    mainnet: {
        vault: 'YOUR_MAINNET_VAULT_WASM_HASH',
        token: 'YOUR_MAINNET_TOKEN_WASM_HASH',
    },
} as const;

// Explorer URLs
export const EXPLORER_URLS = {
    testnet: {
        contract: 'https://stellar.expert/explorer/testnet/contract/',
        account: 'https://stellar.expert/explorer/testnet/account/',
        tx: 'https://stellar.expert/explorer/testnet/tx/',
    },
    mainnet: {
        contract: 'https://stellar.expert/explorer/public/contract/',
        account: 'https://stellar.expert/explorer/public/account/',
        tx: 'https://stellar.expert/explorer/public/tx/',
    },
} as const;