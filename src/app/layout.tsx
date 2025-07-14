'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TransactionOverlay } from "@/components/transaction-overlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <Providers>
          <div className="relative min-h-screen">
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            <TransactionOverlay />
          </div>
        </Providers>
      </body>
    </html>
  );
}