'use client'

import { useEffect, useState } from 'react'
import { supabase, type UserProfile } from '@/lib/supabase'

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
  PA: 'Panama', GT: 'Guatemala', US: 'United States', ES: 'Spain', OTHER: 'Other',
}

function fmt(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}
function fmtUsd(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function exportCsv(users: EnrichedUser[]) {
  const header = 'rank,wallet,name,email,x,telegram,whatsapp,country,score,txns,volume,contracts,registered_at'
  const body = users.map(u => [
    u.rank ?? '', u.wallet_address, u.name, u.email ?? '', u.x_username ?? '',
    u.telegram_handle ?? '', u.whatsapp ?? '', u.country_code ?? '',
    u.activity_score ?? '', (u.native_tx_count ?? 0) + (u.token_tx_count ?? 0),
    u.total_token_volume_usd ?? '', u.contracts_deployed ?? '', u.registered_at,
  ].join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = 'users.csv'; a.click(); URL.revokeObjectURL(url)
}

export default function UsersPage() {
  const [users, setUsers] = useState<EnrichedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'registered_at' | 'rank' | 'activity_score'>('registered_at')
  const [filterTop30, setFilterTop30] = useState(false)

  useEffect(() => {
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
        return { ...u, rank: d?.rank ?? null, activity_score: d?.activity_score ?? null,
          native_tx_count: d?.native_tx_count ?? null, token_tx_count: d?.token_tx_count ?? null,
          total_token_volume_usd: d?.total_token_volume_usd ?? null, contracts_deployed: d?.contracts_deployed ?? null }
      })
      setUsers(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = users
    .filter(u => {
      if (filterTop30 && (u.rank === null || u.rank > 30)) return false
      if (!search) return true
      const q = search.toLowerCase()
      return u.wallet_address.includes(q) || u.name.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) || u.x_username?.toLowerCase().includes(q) ||
        u.telegram_handle?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'rank') return (a.rank ?? 9999) - (b.rank ?? 9999)
      if (sortBy === 'activity_score') return (b.activity_score ?? 0) - (a.activity_score ?? 0)
      return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
    })

  const dim = 'text-[#464652]'
  const muted = 'text-[#908f9d]'

  return (
    <div className="p-8 flex flex-col gap-8 max-w-7xl">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em] mb-2">// operative_registry</p>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl font-extrabold text-[#e5e2e3] uppercase tracking-tight">Registered Users</h1>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#464652] uppercase tracking-wider mt-2">
            <span className="text-[#e5e2e3]">{users.length}</span> total ·{' '}
            <span className="text-[#c0c1ff]">{users.filter(u => u.rank !== null && u.rank <= 30).length}</span> in top 30
          </p>
        </div>
        <button onClick={() => exportCsv(filtered)}
          className="cyber-gradient text-[#0e0e0f] font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-[0.2em] px-6 py-3 hover:shadow-[0_0_20px_rgba(46,49,146,0.5)] transition-all">
          ⬇ Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <input type="text" placeholder="Search name, wallet, email, @handle…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 bg-transparent border-b border-[#464652]/40 focus:border-[#c0c1ff]/60 text-[#e5e2e3] font-[family-name:var(--font-body)] text-xs py-2 px-0 placeholder-[#464652] focus:outline-none transition-colors"
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-[#1c1b1c] border border-[#464652]/40 text-[#e5e2e3] font-[family-name:var(--font-body)] text-xs py-2 px-3 focus:outline-none focus:border-[#c0c1ff]/60">
          <option value="registered_at">Newest first</option>
          <option value="rank">Leaderboard rank</option>
          <option value="activity_score">Score</option>
        </select>
        <button onClick={() => setFilterTop30(f => !f)}
          className={`font-[family-name:var(--font-body)] text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${filterTop30 ? 'border-[#c0c1ff]/40 text-[#c0c1ff] bg-[#2e3192]/10' : 'border-[#464652]/30 text-[#908f9d] hover:text-[#c0c1ff]'}`}>
          ⚡ Top 30 only
        </button>
        <span className={`font-[family-name:var(--font-body)] text-[9px] ${dim} uppercase tracking-widest`}>{filtered.length} users</span>
      </div>

      {loading ? (
        <div className={`text-center font-[family-name:var(--font-body)] ${muted} text-xs uppercase tracking-widest py-20`}>Loading…</div>
      ) : (
        <div className="overflow-x-auto border border-[#464652]/15">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0e0e0f] border-b border-[#464652]/20 text-left">
                {['Rank','Name','Wallet','Email','X','Telegram','WA','Country','Score','Txns','Volume','Contracts','Registered'].map(h => (
                  <th key={h} className={`px-3 py-3 font-[family-name:var(--font-body)] text-[9px] ${muted} uppercase tracking-widest ${['Score','Txns','Volume','Contracts'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => (
                <tr key={u.wallet_address} className={`border-b border-[#464652]/10 last:border-0 hover:bg-[#201f20] transition-colors ${u.rank !== null && u.rank <= 30 ? 'bg-[#2e3192]/10' : idx % 2 === 0 ? 'bg-[#1c1b1c]' : 'bg-[#0e0e0f]'}`}>
                  <td className="px-3 py-2.5 font-mono">
                    {u.rank !== null
                      ? <span className={u.rank <= 30 ? 'text-[#c0c1ff] font-bold' : muted}>#{u.rank}</span>
                      : <span className={dim}>—</span>}
                  </td>
                  <td className={`px-3 py-2.5 font-[family-name:var(--font-body)] font-bold text-[#e5e2e3] whitespace-nowrap`}>{u.name}</td>
                  <td className="px-3 py-2.5 font-mono">
                    <a href={`https://basescan.org/address/${u.wallet_address}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">
                      {u.wallet_address.slice(0, 6)}…{u.wallet_address.slice(-4)}
                    </a>
                  </td>
                  <td className={`px-3 py-2.5 ${muted}`}>{u.email ?? <span className={dim}>—</span>}</td>
                  <td className="px-3 py-2.5">
                    {u.x_username
                      ? <a href={`https://x.com/${u.x_username}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">@{u.x_username}</a>
                      : <span className={dim}>—</span>}
                  </td>
                  <td className={`px-3 py-2.5 ${muted}`}>{u.telegram_handle ? `@${u.telegram_handle}` : <span className={dim}>—</span>}</td>
                  <td className={`px-3 py-2.5 ${muted}`}>{u.whatsapp ?? <span className={dim}>—</span>}</td>
                  <td className={`px-3 py-2.5 ${muted}`}>{u.country_code ? (COUNTRY_NAMES[u.country_code] ?? u.country_code) : <span className={dim}>—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-[family-name:var(--font-headline)] font-bold text-[#c0c1ff]">{fmt(u.activity_score)}</td>
                  <td className={`px-3 py-2.5 text-right ${muted}`}>{fmt(u.native_tx_count !== null && u.token_tx_count !== null ? u.native_tx_count + u.token_tx_count : null)}</td>
                  <td className={`px-3 py-2.5 text-right ${muted}`}>{fmtUsd(u.total_token_volume_usd)}</td>
                  <td className={`px-3 py-2.5 text-right ${muted}`}>{fmt(u.contracts_deployed)}</td>
                  <td className={`px-3 py-2.5 ${dim} whitespace-nowrap`}>
                    {new Date(u.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className={`text-center ${dim} font-[family-name:var(--font-body)] text-xs uppercase tracking-widest py-12`}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
