"use client";

import { VaultState } from '@/components/vault/vault-state';
import { VaultActions } from '@/components/vault/vault-actions';

export default function VaultsPage() {
    return (
        <div className="container mx-auto max-w-7xl space-y-6 py-6">
            {/* Vault Interface */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Vault State - Left Side */}
                <VaultState />

                {/* Vault Actions - Right Side */}
                <VaultActions />
            </div>
        </div>
    );
}