'use client';

import { Branding } from './branding';
import { Navbar } from './navbar';
import { Wallet } from './wallet';

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Left side */}
                    <div className="flex items-center gap-8">
                        <Branding />
                        <Navbar className="hidden md:flex" />
                    </div>

                    {/* Right side - Wallet component handles all wallet-related UI */}
                    <Wallet />
                </div>
            </div>
        </header>
    );
}