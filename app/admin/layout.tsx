'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ''

const AuthContext = createContext(false)
export function useAuth() { return useContext(AuthContext) }

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard',  sym: '◈' },
  { href: '/admin/sources',   label: 'Sources',    sym: '⬡' },
  { href: '/admin/dataset',   label: 'Dataset',    sym: '◉' },
  { href: '/admin/users',     label: 'Users',      sym: '◇' },
  { href: '/admin/top30',     label: 'Top 30',     sym: '⚡' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (sessionStorage.getItem('admin_authed') === '1') setAuthed(true)
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', '1')
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center sacred-bg">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-6 mb-8">
            <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-16 h-16 object-contain" />
            <div className="text-center">
              <p className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-[0.3em] mb-2">// master_control_node</p>
              <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold text-[#e5e2e3] uppercase tracking-tight">
                SYSTEM <span className="text-[#c0c1ff]">ACCESS</span>
              </h1>
            </div>
          </div>

          <form onSubmit={handleLogin} className="bg-[#1c1b1c] border border-[#464652]/15 p-8 flex flex-col gap-6" style={{ boxShadow: '0 0 30px rgba(46,49,146,0.1)' }}>
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Access key"
                autoFocus
                className="w-full bg-transparent border-0 border-b border-[#464652]/40 focus:border-[#c0c1ff]/60 focus:ring-0 text-[#e5e2e3] font-[family-name:var(--font-body)] text-base py-3 px-0 placeholder-[#464652] transition-colors outline-none"
              />
              <label className="absolute left-0 -top-4 text-[10px] font-[family-name:var(--font-body)] uppercase tracking-widest text-[#908f9d]">
                Authorization Key
              </label>
            </div>

            {pwError && (
              <p className="font-[family-name:var(--font-body)] text-[11px] text-[#ffb4ab] uppercase tracking-widest">
                — Access denied. Invalid credentials.
              </p>
            )}

            <button
              type="submit"
              className="w-full cyber-gradient text-[#0e0e0f] font-[family-name:var(--font-headline)] font-bold text-sm uppercase tracking-[0.2em] py-4 hover:shadow-[0_0_30px_rgba(46,49,146,0.6)] transition-all duration-300"
            >
              AUTHENTICATE
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="font-[family-name:var(--font-body)] text-[10px] text-[#464652] hover:text-[#908f9d] uppercase tracking-widest transition-colors">
              ← Back to leaderboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={authed}>
      <div className="min-h-screen flex sacred-bg">

        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-[#464652]/20 flex flex-col bg-[#0e0e0f]/80 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-[#464652]/20">
            <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-8 h-8 object-contain" />
            <div>
              <div className="font-[family-name:var(--font-headline)] text-sm font-bold tracking-widest uppercase text-[#e5e2e3] leading-none">ETH CALI</div>
              <div className="font-[family-name:var(--font-body)] text-[9px] text-[#c0c1ff]/60 tracking-widest mt-0.5 uppercase">Terminal</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 px-3 pt-4 flex-grow">
            <p className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-[0.25em] px-2 mb-2">// Control Nodes</p>
            {NAV.map(n => {
              const isActive = pathname === n.href
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-3 px-3 py-2.5 font-[family-name:var(--font-body)] text-xs uppercase tracking-widest transition-all border-l-2 ${
                    isActive
                      ? 'border-[#c0c1ff] bg-[#2e3192]/20 text-[#c0c1ff]'
                      : 'border-transparent text-[#908f9d] hover:text-[#c0c1ff] hover:bg-[#2e3192]/10'
                  }`}
                  style={isActive ? { textShadow: '0 0 8px rgba(192,193,255,0.4)' } : {}}
                >
                  <span className="text-sm">{n.sym}</span>
                  {n.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 pb-5 border-t border-[#464652]/20 pt-4 flex flex-col gap-1">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 font-[family-name:var(--font-body)] text-[10px] text-[#464652] hover:text-[#908f9d] uppercase tracking-widest transition-colors">
              ← Leaderboard
            </Link>
            <button
              onClick={() => { sessionStorage.removeItem('admin_authed'); setAuthed(false) }}
              className="w-full text-left px-3 py-2 font-[family-name:var(--font-body)] text-[10px] text-[#464652] hover:text-[#ffb4ab] uppercase tracking-widest transition-colors"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AuthContext.Provider>
  )
}
