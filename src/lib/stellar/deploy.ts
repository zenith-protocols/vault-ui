import {
    StrKey,
    hash,
    xdr,
    Address
} from '@stellar/stellar-sdk';

/**
 * Generate a deterministic contract ID for deployment
 * This allows us to know the contract address before deployment
 */
export function generateContractId(
    deployerAddress: string,
    salt: Buffer,
    networkPassphrase: string
): string {
    const networkId = hash(Buffer.from(networkPassphrase));

    const contractIdPreimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
            address: Address.fromString(deployerAddress).toScAddress(),
            salt: salt,
        })
    );

    const hashIdPreimage = xdr.HashIdPreimage.envelopeTypeContractId(
        new xdr.HashIdPreimageContractId({
            networkId: networkId,
            contractIdPreimage: contractIdPreimage,
        })
    );

    return StrKey.encodeContract(hash(hashIdPreimage.toXDR()));
}

/**
 * Generate a random salt for contract deployment
 */
export function generateSalt(): Buffer {
    // Use crypto.getRandomValues for browser compatibility
    const salt = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(salt);
    } else {
        crypto.getRandomValues(salt);
    }
    return Buffer.from(salt);
}