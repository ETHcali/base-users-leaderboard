'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ''

const AuthContext = createContext(false)
export function useAuth() { return useContext(AuthContext) }

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/sources',   label: 'Sources',   icon: '🗃️' },
  { href: '/admin/dataset',   label: 'Dataset',   icon: '🗂️' },
  { href: '/admin/users',     label: 'Users',     icon: '👥' },
  { href: '/admin/top30',     label: 'Top 30',    icon: '🏆' },
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-lg font-bold text-white">ETH Cali Admin</h1>
              <p className="text-gray-500 text-xs">Base Leaderboard Management</p>
            </div>
          </div>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Admin password" autoFocus
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
          />
          {pwError && <p className="text-red-400 text-xs">Incorrect password.</p>}
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
            Enter
          </button>
        </form>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={authed}>
      <div className="min-h-screen flex bg-gray-950">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-gray-800 flex flex-col py-6 px-3 gap-1">
          <div className="flex items-center gap-2 px-3 mb-5">
            <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-8 h-8 rounded-lg" />
            <span className="text-sm font-bold text-white">ETH Cali</span>
          </div>
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                pathname === n.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <span>{n.icon}</span> {n.label}
            </Link>
          ))}
          <div className="mt-auto">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-gray-400">
              ← Leaderboard
            </Link>
            <button
              onClick={() => { sessionStorage.removeItem('admin_authed'); setAuthed(false) }}
              className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:text-red-400"
            >
              Sign out
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
