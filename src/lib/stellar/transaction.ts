import {
    Horizon,
    rpc,
    Transaction,
} from '@stellar/stellar-sdk';
import type { SimulationResult, TransactionResult } from './types';

/**
 * Submit transaction via Soroban RPC
 */
export async function sendTransaction(
    rpcServer: rpc.Server,
    transaction: Transaction
): Promise<TransactionResult> {
    try {
        let sendResponse = await rpcServer.sendTransaction(transaction);
        const startTime = Date.now();

        // Poll for pending status (max 5 seconds)
        while (sendResponse.status !== 'PENDING' && (Date.now() - startTime < 5000)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            sendResponse = await rpcServer.sendTransaction(transaction);
        }
        if (sendResponse.status !== 'PENDING') {
            return {
                success: false,
                error: `Failed to submit transaction: ${sendResponse.status}`
            };
        }

        // Poll for final result
        let txResponse = await rpcServer.getTransaction(sendResponse.hash);
        while (txResponse.status === 'NOT_FOUND') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            txResponse = await rpcServer.getTransaction(sendResponse.hash);
        }

        if (txResponse.status === 'SUCCESS') {
            return {
                success: true,
                hash: sendResponse.hash,
                result: txResponse as rpc.Api.GetSuccessfulTransactionResponse
            };
        } else {
            return {
                success: false,
                error: `Transaction failed: ${txResponse.status}`,
                result: txResponse as rpc.Api.GetFailedTransactionResponse
            };
        }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'RPC submission failed'
        };
    }
}

//********** Transaction Simulation **********//

/**
 * Simulate a transaction on Soroban
 */
export async function simulateTransaction(
    rpcServer: rpc.Server,
    transaction: Transaction
): Promise<SimulationResult> {
    try {
        const result = await rpcServer.simulateTransaction(transaction);

        if (rpc.Api.isSimulationSuccess(result)) {
            return {
                success: true,
                result,
            };
        } else {
            const error = 'error' in result ? String(result.error) : 'Simulation failed';
            return {
                success: false,
                error
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Simulation failed';
        return {
            success: false,
            error: errorMessage
        };
    }
}

//********** Account Operations **********//

/**
 * Fetch account details from Horizon API
 */
export async function fetchAccount(
    server: Horizon.Server,
    publicKey: string
): Promise<Horizon.AccountResponse | null> {
    try {
        const account = await server.loadAccount(publicKey);
        return account;
    } catch (error) {
        // Handle case where account doesn't exist
        if (error instanceof Error && error.message.includes('not found')) {
            console.log(`Account ${publicKey} not found`);
            return null;
        }
        // Log and rethrow other errors
        console.error('Error fetching account from Horizon:', error);
        throw error;
    }
}