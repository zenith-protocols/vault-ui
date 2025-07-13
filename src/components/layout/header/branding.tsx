'use client';

import Link from 'next/link';

export function Branding() {
    return (
        <Link
            href="/"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
            {/* Optional: Add logo image here */}
            {/* <Image src="/logo.svg" alt="Zenex" width={32} height={32} /> */}

            <span className="text-xl font-bold tracking-tight">
                Zenith Protocols Vaults
            </span>
        </Link>
    );
}