'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavbarProps {
    className?: string;
}

interface NavItem {
    href: string;
    label: string;
    external?: boolean;
}

const navItems: NavItem[] = [
    { href: '/deploy', label: 'Deploy' },
    { href: '/vaults', label: 'Vaults' },

];

export function Navbar({ className }: NavbarProps) {
    const pathname = usePathname();

    return (
        <nav className={cn('flex items-center space-x-6', className)}>
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'text-sm font-medium transition-colors hover:text-primary',
                            isActive ? 'text-foreground' : 'text-muted-foreground'
                        )}
                        {...(item.external && {
                            target: '_blank',
                            rel: 'noopener noreferrer',
                        })}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}