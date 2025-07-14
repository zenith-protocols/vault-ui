// src/lib/vault.ts
import {
    Contract,
    SorobanRpc,
    Account,
    TransactionBuilder,
    Operation,
    Asset,
    Keypair,
    StrKey,
    scValToNative,
    nativeToScVal,
    Address,
    xdr
} from '@stellar/stellar-sdk';
import { TX_SETTINGS } from '@/lib/stellar/constants';
import type { NetworkConfig } from '@/lib/stellar/types';

// Types
export interface VaultData {
    // Core vault info
    shareToken: string;
    totalShares: string;
    totalTokens: string;
    minLiquidityRate: number;
    redemptionDelay: number;
    maxPenaltyRate: number;

    // Token info
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;

    // Share token info
    shareSymbol: string;
    shareName: string;

    // Calculated values
    sharePrice: number;
    totalValueLocked: string;
    availableLiquidity: string;

    // User specific (if wallet connected)
    userShareBalance?: string;
    userTokenBalance?: string;
    userRedemption?: {
        shares: string;
        unlockTime: number;
    };

    // Strategies
    strategies: Array<{
        address: string;
        borrowed: string;
        netImpact: string;
    }>;
}

export interface DeployVaultParams {
    network: NetworkConfig;
    source: string;
    wasmHash: string;
    tokenWasmHash: string;
    tokenAddress: string;
    name: string;
    symbol: string;
    strategies: string[];
    minLiquidityRate: number;
    redemptionDelay: number;
    maxPenaltyRate: number;
}

// Helper to create a dummy account for simulations
const getDummyAccount = () => {
    return new Account(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        '0'
    );
};

// Deploy a new vault
export async function deployVault(params: DeployVaultParams): Promise<string> {
    const {
        network,
        source,
        wasmHash,
        tokenWasmHash,
        tokenAddress,
        name,
        symbol,
        strategies,
        minLiquidityRate,
        redemptionDelay,
        maxPenaltyRate,
    } = params;

    try {
        const server = new SorobanRpc.Server(network.rpc);

        // Get source account
        const sourceAccount = await server.getAccount(source);

        // Create deploy operation
        const deployOp = Operation.createStellarAssetContract({
            asset: Asset.native(), // This is a placeholder - need actual deploy op
            source,
        });

        // Build transaction
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: TX_SETTINGS.BASE_FEE,
            networkPassphrase: network.passphrase,
        })
            .addOperation(deployOp)
            .setTimeout(TX_SETTINGS.TIMEOUT)
            .build();

        return transaction;
    } catch (error) {
        console.error('Error creating deployment transaction:', error);
        throw error;
    }
}

// Load vault data
export async function loadVaultData(
    network: NetworkConfig,
    vaultAddress: string,
    userAddress?: string
): Promise<VaultData | null> {
    try {
        const server = new SorobanRpc.Server(network.rpc);
        const vaultContract = new Contract(vaultAddress);

        // Batch read operations for efficiency
        const operations = [
            vaultContract.call('share_token'),
            vaultContract.call('total_shares'),
            vaultContract.call('total_tokens'),
            vaultContract.call('token'),
            vaultContract.call('min_liquidity_rate'),
            vaultContract.call('redemption_delay'),
            vaultContract.call('max_penalty_rate'),
        ];

        const tx = new TransactionBuilder(getDummyAccount(), {
            fee: TX_SETTINGS.BASE_FEE,
            networkPassphrase: network.passphrase,
        });

        operations.forEach(op => tx.addOperation(op));
        const transaction = tx.setTimeout(30).build();

        const simulation = await server.simulateTransaction(transaction);

        if (!SorobanRpc.Api.isSimulationSuccess(simulation)) {
            console.error('Failed to simulate vault info transaction');
            return null;
        }

        // Parse results - this is a simplified version
        // You'll need to properly parse each result based on the contract's return types
        const results = simulation.result?.retval;
        if (!results || results.length < 7) return null;

        const shareToken = scValToNative(results[0]);
        const totalShares = scValToNative(results[1]);
        const totalTokens = scValToNative(results[2]);
        const tokenAddress = scValToNative(results[3]);
        const minLiquidityRate = scValToNative(results[4]);
        const redemptionDelay = scValToNative(results[5]);
        const maxPenaltyRate = scValToNative(results[6]);

        // Load user-specific data if address provided
        let userShareBalance, userTokenBalance, userRedemption;
        if (userAddress) {
            const userData = await loadUserVaultData(network, vaultAddress, shareToken, tokenAddress, userAddress);
            userShareBalance = userData.shareBalance;
            userTokenBalance = userData.tokenBalance;
            userRedemption = userData.redemption;
        }

        // Load strategies
        const strategies = await loadVaultStrategies(network, vaultAddress);

        // Calculate derived values
        const sharePrice = Number(totalShares) > 0 ? Number(totalTokens) / Number(totalShares) : 1;
        const totalBorrowed = strategies.reduce((sum, s) => sum + Number(s.borrowed), 0);
        const availableLiquidity = (Number(totalTokens) - totalBorrowed).toString();

        return {
            shareToken,
            totalShares: totalShares.toString(),
            totalTokens: totalTokens.toString(),
            minLiquidityRate: Number(minLiquidityRate),
            redemptionDelay: Number(redemptionDelay),
            maxPenaltyRate: Number(maxPenaltyRate),

            tokenAddress,
            tokenSymbol: 'USDC', // TODO: Load from token contract
            tokenDecimals: 7, // TODO: Load from token contract

            shareSymbol: 'vUSDC', // TODO: Load from share token contract
            shareName: 'Vault USDC', // TODO: Load from share token contract

            sharePrice,
            totalValueLocked: totalTokens.toString(),
            availableLiquidity,

            userShareBalance,
            userTokenBalance,
            userRedemption,

            strategies,
        };
    } catch (error) {
        console.error('Error loading vault data:', error);
        return null;
    }
}

// Load user-specific vault data
async function loadUserVaultData(
    network: NetworkConfig,
    vaultAddress: string,
    shareToken: string,
    tokenAddress: string,
    userAddress: string
): Promise<{
    shareBalance?: string;
    tokenBalance?: string;
    redemption?: { shares: string; unlockTime: number };
}> {
    try {
        const server = new SorobanRpc.Server(network.rpc);

        // Load balances
        const shareBalance = await loadTokenBalance(network, shareToken, userAddress);
        const tokenBalance = await loadTokenBalance(network, tokenAddress, userAddress);

        // Load redemption request
        const vaultContract = new Contract(vaultAddress);
        const tx = new TransactionBuilder(getDummyAccount(), {
            fee: TX_SETTINGS.BASE_FEE,
            networkPassphrase: network.passphrase,
        })
            .addOperation(vaultContract.call('get_redemption_request', nativeToScVal(userAddress, { type: 'address' })))
            .setTimeout(30)
            .build();

        const simulation = await server.simulateTransaction(tx);

        let redemption;
        if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result?.retval) {
            const result = scValToNative(simulation.result.retval);
            if (result) {
                redemption = {
                    shares: result.shares.toString(),
                    unlockTime: Number(result.unlock_time),
                };
            }
        }

        return { shareBalance, tokenBalance, redemption };
    } catch (error) {
        console.error('Error loading user vault data:', error);
        return {};
    }
}

// Load vault strategies
async function loadVaultStrategies(
    network: NetworkConfig,
    vaultAddress: string
): Promise<Array<{ address: string; borrowed: string; netImpact: string }>> {
    try {
        const server = new SorobanRpc.Server(network.rpc);
        const vaultContract = new Contract(vaultAddress);

        // First, get the list of strategies
        const getStrategiesTx = new TransactionBuilder(getDummyAccount(), {
            fee: TX_SETTINGS.BASE_FEE,
            networkPassphrase: network.passphrase,
        })
            .addOperation(vaultContract.call('get_strategies'))
            .setTimeout(30)
            .build();

        const strategiesSim = await server.simulateTransaction(getStrategiesTx);

        if (!SorobanRpc.Api.isSimulationSuccess(strategiesSim) || !strategiesSim.result?.retval) {
            return [];
        }

        const strategyAddresses = scValToNative(strategiesSim.result.retval) as string[];

        // Load data for each strategy
        const strategies = await Promise.all(
            strategyAddresses.map(async (address) => {
                try {
                    const tx = new TransactionBuilder(getDummyAccount(), {
                        fee: TX_SETTINGS.BASE_FEE,
                        networkPassphrase: network.passphrase,
                    })
                        .addOperation(vaultContract.call('get_strategy', nativeToScVal(address, { type: 'address' })))
                        .setTimeout(30)
                        .build();

                    const sim = await server.simulateTransaction(tx);

                    if (SorobanRpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
                        const data = scValToNative(sim.result.retval);
                        return {
                            address,
                            borrowed: data.borrowed.toString(),
                            netImpact: data.net_impact.toString(),
                        };
                    }
                } catch (error) {
                    console.error(`Error loading strategy ${address}:`, error);
                }

                return {
                    address,
                    borrowed: '0',
                    netImpact: '0',
                };
            })
        );

        return strategies;
    } catch (error) {
        console.error('Error loading vault strategies:', error);
        return [];
    }
}

// Load token balance
export async function loadTokenBalance(
    network: NetworkConfig,
    tokenAddress: string,
    userAddress: string
): Promise<string> {
    try {
        const server = new SorobanRpc.Server(network.rpc);
        const tokenContract = new Contract(tokenAddress);

        const tx = new TransactionBuilder(getDummyAccount(), {
            fee: TX_SETTINGS.BASE_FEE,
            networkPassphrase: network.passphrase,
        })
            .addOperation(tokenContract.call('balance', nativeToScVal(userAddress, { type: 'address' })))
            .setTimeout(30)
            .build();

        const simulation = await server.simulateTransaction(tx);

        if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result?.retval) {
            const balance = scValToNative(simulation.result.retval);
            return balance.toString();
        }

        return '0';
    } catch (error) {
        console.error('Error loading token balance:', error);
        return '0';
    }
}

// Execute vault deposit
export async function depositToVault(
    network: NetworkConfig,
    source: string,
    vaultAddress: string,
    amount: string
): Promise<string> {
    try {
        const server = new SorobanRpc.Server(network.rpc);
        const sourceAccount = await server.getAccount(source);
        const vaultContract = new Contract(vaultAddress);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: TX_SETTINGS.BASE_FEE,
            networkPassphrase: network.passphrase,
        })
            .addOperation(
                vaultContract.call(
                    'deposit',
                    nativeToScVal(amount, { type: 'i128' }),
                    nativeToScVal(source, { type: 'address' }),
                    nativeToScVal(source, { type: 'address' })
                )
            )
            .setTimeout(TX_SETTINGS.TIMEOUT)
            .build();

        return tx;
    } catch (error) {
        console.error('Error creating deposit transaction:', error);
        throw error;
    }
}

// Request redemption
export async function requestRedemption(
    network: NetworkConfig,
    source: string,
    vaultAddress: string,
    shares: string
): Promise<string> {
    try {
        const server = new SorobanRpc.Server(network.rpc);
        const sourceAccount = await server.getAccount(source);
        const vaultContract = new Contract(vaultAddress);

        const tx = new TransactionBuilder(sourceAccount, {
            fee: TX_SETTINGS.BASE_FEE,
            networkPassphrase: network.passphrase,
        })
            .addOperation(
                vaultContract.call(
                    'request_redeem',
                    nativeToScVal(shares, { type: 'i128' }),
                    nativeToScVal(source, { type: 'address' })
                )
            )
            .setTimeout(TX_SETTINGS.TIMEOUT)
            .build();

        return tx;
    } catch (error) {
        console.error('Error creating redemption request:', error);
        throw error;
    }
}