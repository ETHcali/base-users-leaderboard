'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type UserProfile } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ''
const DUNE_QUERY_ID = '6634911'
const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''

type DuneRow = {
  address: string
  activity_score: number
  native_tx_count: number
  token_tx_count: number
  total_token_volume_usd: number
  contracts_deployed: number
}

type EnrichedUser = UserProfile & {
  rank: number | null
  activity_score: number | null
  native_tx_count: number | null
  token_tx_count: number | null
  total_token_volume_usd: number | null
  contracts_deployed: number | null
}

const COUNTRY_NAMES: Record<string, string> = {
  CO: 'Colombia', MX: 'Mexico', AR: 'Argentina', BR: 'Brazil',
  CL: 'Chile', PE: 'Peru', VE: 'Venezuela', EC: 'Ecuador',
  BO: 'Bolivia', PY: 'Paraguay', UY: 'Uruguay', CR: 'Costa Rica',
  PA: 'Panama', GT: 'Guatemala', US: 'United States', ES: 'Spain',
  OTHER: 'Other',
}

function fmt(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}
function fmtUsd(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)
  const [users, setUsers] = useState<EnrichedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'registered_at' | 'rank' | 'activity_score'>('registered_at')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) { setAuthed(true); setPwError(false) }
    else setPwError(true)
  }

  useEffect(() => {
    if (!authed) return
    async function load() {
      setLoading(true)
      const [{ data: supaUsers }, duneRes] = await Promise.all([
        supabase.from('users').select('*').order('registered_at', { ascending: false }),
        fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results?limit=500`, {
          headers: { 'X-Dune-API-Key': DUNE_API_KEY },
        }).then(r => r.json()),
      ])

      const duneRows: DuneRow[] = duneRes?.result?.rows ?? []
      const rankMap = new Map(duneRows.map((r, i) => [r.address.toLowerCase(), { rank: i + 1, ...r }]))

      const enriched: EnrichedUser[] = (supaUsers ?? []).map(u => {
        const d = rankMap.get(u.wallet_address.toLowerCase())
        return {
          ...u,
          rank: d?.rank ?? null,
          activity_score: d?.activity_score ?? null,
          native_tx_count: d?.native_tx_count ?? null,
          token_tx_count: d?.token_tx_count ?? null,
          total_token_volume_usd: d?.total_token_volume_usd ?? null,
          contracts_deployed: d?.contracts_deployed ?? null,
        }
      })
      setUsers(enriched)
      setLoading(false)
    }
    load()
  }, [authed])

  const filtered = users
    .filter(u => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        u.wallet_address.includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.x_username?.toLowerCase().includes(q) ||
        u.telegram_handle?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'rank') return (a.rank ?? 9999) - (b.rank ?? 9999)
      if (sortBy === 'activity_score') return (b.activity_score ?? 0) - (a.activity_score ?? 0)
      return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
    })

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4">
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <p className="text-gray-500 text-sm">ETH Cali Leaderboard — Admin Panel</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
          />
          {pwError && <p className="text-red-400 text-xs">Incorrect password.</p>}
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-2.5 text-sm">
            Enter
          </button>
        </form>
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-10 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">ETH Cali — Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Registered users · Base Network leaderboard</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-500">Registered</span>
            <span className="ml-2 font-bold text-white">{users.length}</span>
          </div>
          <Link href="/admin/sources" className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors flex items-center gap-1.5">
            <span>🗃️</span> Manage Sources
          </Link>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-500">Top 30 registered</span>
            <span className="ml-2 font-bold text-emerald-400">
              {users.filter(u => u.rank !== null && u.rank <= 30).length}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search name, wallet, email, @handle…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="registered_at">Sort: Newest first</option>
          <option value="rank">Sort: Leaderboard rank</option>
          <option value="activity_score">Sort: Score</option>
        </select>
        <span className="text-xs text-gray-600">{filtered.length} users</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-800 bg-gray-900 text-left">
                <th className="px-3 py-3">Rank</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Wallet</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">X</th>
                <th className="px-3 py-3">Telegram</th>
                <th className="px-3 py-3">WhatsApp</th>
                <th className="px-3 py-3">Country</th>
                <th className="px-3 py-3 text-right">Score</th>
                <th className="px-3 py-3 text-right">Txns</th>
                <th className="px-3 py-3 text-right">Volume</th>
                <th className="px-3 py-3 text-right">Contracts</th>
                <th className="px-3 py-3">Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.wallet_address} className={`border-b border-gray-800 last:border-0 hover:bg-gray-900/50 ${u.rank !== null && u.rank <= 30 ? 'bg-emerald-950/20' : ''}`}>
                  <td className="px-3 py-2.5 font-mono">
                    {u.rank !== null ? (
                      <span className={u.rank <= 30 ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
                        #{u.rank}
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap">{u.name}</td>
                  <td className="px-3 py-2.5 font-mono">
                    <a href={`https://basescan.org/address/${u.wallet_address}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      {u.wallet_address.slice(0, 6)}…{u.wallet_address.slice(-4)}
                    </a>
                  </td>
                  <td className="px-3 py-2.5 text-gray-300">{u.email ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-3 py-2.5">
                    {u.x_username
                      ? <a href={`https://x.com/${u.x_username}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@{u.x_username}</a>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-300">{u.telegram_handle ? `@${u.telegram_handle}` : <span className="text-gray-600">—</span>}</td>
                  <td className="px-3 py-2.5 text-gray-300">{u.whatsapp ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-3 py-2.5 text-gray-300">{u.country_code ? (COUNTRY_NAMES[u.country_code] ?? u.country_code) : <span className="text-gray-600">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-white">{fmt(u.activity_score)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-300">{fmt(u.native_tx_count !== null && u.token_tx_count !== null ? u.native_tx_count + u.token_tx_count : null)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-300">{fmtUsd(u.total_token_volume_usd)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-300">{fmt(u.contracts_deployed)}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {new Date(u.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="text-center text-gray-600 py-12">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
