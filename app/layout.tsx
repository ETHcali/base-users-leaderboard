import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: "ETH Cali — Multi-Chain Leaderboard",
  description: "Onchain activity leaderboard for ETH Cali onboarded users across Base, Ethereum, Optimism, Polygon, Gnosis and Unichain",
  icons: {
    icon: [{ url: '/branding/Open SEA - Ethereum Cali3.png', type: 'image/png' }],
    shortcut: '/branding/Open SEA - Ethereum Cali3.png',
    apple: '/branding/Open SEA - Ethereum Cali3.png',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${spaceGrotesk.variable} h-full`}>
      <body className="min-h-full flex flex-col sacred-bg text-[#e5e2e3] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
