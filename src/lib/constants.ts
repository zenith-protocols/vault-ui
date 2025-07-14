// WASM hashes for deployment
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