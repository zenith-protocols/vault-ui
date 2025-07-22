import type { rpc } from '@stellar/stellar-sdk';

// Network Configuration
export interface NetworkConfig {
    rpc: string;
    horizon: string;
    passphrase: string;
    explorer?: string;
}

// Transaction Types
export enum TxStatus {
    NONE = 'none',
    BUILDING = 'building',
    SIGNING = 'signing',
    SUBMITTING = 'submitting',
    SUCCESS = 'success',
    FAIL = 'fail',
}

export interface TransactionResult {
    success: boolean;
    hash?: string;
    error?: string;
    result?: rpc.Api.GetTransactionResponse;
}

export interface SimulationResult {
    success: boolean;
    result?: rpc.Api.SimulateTransactionSuccessResponse;
    error?: string;
}