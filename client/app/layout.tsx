// =============================================================================
// CollateralX Protocol – Root Layout
// =============================================================================

import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { ToastContainer } from "@/components/ui/Toast";
import { ReceiptModal } from "@/components/receipt/ReceiptModal";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "CollateralX Protocol – Programmable Trust for Rental Collateral",
  description:
    "A decentralized, risk-based collateral protocol for informal asset rentals. Dynamic security deposits driven by your on-chain trust score.",
  keywords: ["Web3", "DeFi", "rental", "collateral", "trust score", "blockchain"],
  openGraph: {
    title: "CollateralX Protocol",
    description: "Programmable Trust for Rental Collateral",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <Navbar />
          <main className="relative z-10">{children}</main>
          <ToastContainer />
          <ReceiptModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
