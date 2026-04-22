'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const NAV_ITEMS = [
  { href: '/',        label: 'Leaderboard', desktopIcon: '◈', mobileIcon: '◈' },
  { href: '/sources', label: 'Sources',     desktopIcon: '◇', mobileIcon: '◫' },
  { href: '/about',   label: 'About',       desktopIcon: '◇', mobileIcon: '◉' },
  { href: '/profile', label: 'Profile',     desktopIcon: '◇', mobileIcon: '◇' },
] as const

function isActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop header */}
      <header
        className="hidden md:flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-[#131314]/90 backdrop-blur-xl border-b border-[#464652]/20"
        style={{ boxShadow: '0 10px 40px -10px rgba(46,49,146,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <Image src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" width={32} height={32} />
          <span className="font-headline text-lg font-bold tracking-widest uppercase text-[#e5e2e3]">ETH CALI</span>
        </div>
        <nav className="flex gap-6 font-label text-xs uppercase tracking-widest">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href, pathname)
            return active ? (
              <span key={item.href} className="text-[#c0c1ff] flex items-center gap-1.5" style={{ textShadow: '0 0 12px rgba(192,193,255,0.6)' }}>
                <span>◈</span> {item.label}
              </span>
            ) : (
              <Link key={item.href} href={item.href} className="text-[#e5e2e3]/40 hover:text-[#c0c1ff] transition-colors flex items-center gap-1.5">
                <span>{item.desktopIcon}</span> {item.label}
              </Link>
            )
          })}
        </nav>
        <ConnectButton />
      </header>

      {/* Mobile header */}
      <header className="md:hidden flex justify-between items-center px-5 py-4 sticky top-0 z-50 bg-[#131314]/90 backdrop-blur-xl border-b border-[#464652]/20">
        <div className="flex items-center gap-2">
          <Image src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" width={28} height={28} />
          <span className="font-headline text-base font-bold tracking-widest uppercase text-[#e5e2e3]">ETH CALI</span>
        </div>
        <ConnectButton />
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 w-full z-50 flex h-20 bg-[#0e0e0f]/95 backdrop-blur-xl border-t border-[#c0c1ff]/10"
        style={{ boxShadow: '0 -10px 40px rgba(46,49,146,0.15)' }}
      >
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                active
                  ? 'bg-gradient-to-b from-[#2e3192]/60 to-transparent text-[#c0c1ff]'
                  : 'text-[#e5e2e3]/30 hover:text-[#c0c1ff]'
              }`}
            >
              <span className="text-lg">{item.mobileIcon}</span>
              <span className="font-label text-[9px] uppercase tracking-widest">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
