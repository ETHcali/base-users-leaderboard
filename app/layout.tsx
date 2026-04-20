import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ETH Cali — Base Leaderboard",
  description: "Onchain activity leaderboard for ETH Cali onboarded users on Base",
  icons: {
    icon: [
      { url: '/branding/Open SEA - Ethereum Cali3.png', type: 'image/png' },
    ],
    shortcut: '/branding/Open SEA - Ethereum Cali3.png',
    apple: '/branding/Open SEA - Ethereum Cali3.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
