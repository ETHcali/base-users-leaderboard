'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { RegisterModal } from './components/RegisterModal'
import { supabase, type UserProfile } from '@/lib/supabase'

const DUNE_QUERY_ID = '6634911'
const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''
const TOP_N = 30

type Row = {
  address: string
  native_tx_count: number
  token_tx_count: number
  total_token_volume_usd: number
  contracts_deployed: number
  activity_score: number
  first_tx_time: string | null
  last_tx_time: string | null
}

type DuneResponse = {
  execution_ended_at: string
  result: {
    rows: Row[]
    metadata: { total_row_count: number }
  }
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

function ScoreTooltip({ row }: { row: Row }) {
  const parts = [
    { label: 'Native txns', value: row.native_tx_count, pts: row.native_tx_count * 1, formula: `${fmt(row.native_tx_count)} × 1` },
    { label: 'Token txns', value: row.token_tx_count, pts: row.token_tx_count * 2, formula: `${fmt(row.token_tx_count)} × 2` },
    { label: 'Volume', value: row.total_token_volume_usd, pts: row.total_token_volume_usd / 100, formula: `$${fmt(row.total_token_volume_usd)} ÷ 100` },
    { label: 'Contracts', value: row.contracts_deployed, pts: row.contracts_deployed * 3, formula: `${row.contracts_deployed} × 3` },
  ]
  return (
    <div className="absolute z-10 right-0 top-6 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-3 text-xs text-left">
      <div className="font-semibold text-white mb-2">Score breakdown</div>
      {parts.map(p => (
        <div key={p.label} className="flex justify-between text-gray-300 py-0.5">
          <span>{p.label} <span className="text-gray-500">({p.formula})</span></span>
          <span className="text-white font-mono ml-2">+{fmt(p.pts)}</span>
        </div>
      ))}
      <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between font-semibold text-white">
        <span>Total</span>
        <span>{fmt(row.activity_score)}</span>
      </div>
    </div>
  )
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [hoveredScore, setHoveredScore] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(
          `https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results?limit=500`,
          { headers: { 'X-Dune-API-Key': DUNE_API_KEY } }
        )
        if (!res.ok) throw new Error('Failed to fetch leaderboard')
        const data: DuneResponse = await res.json()
        setRows(data.result.rows ?? [])
        setLastUpdated(data.execution_ended_at ?? null)
      } catch {
        setError('Could not load leaderboard. Try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  useEffect(() => {
    if (!address) { setProfile(null); return }
    supabase
      .from('users')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .maybeSingle()
      .then(({ data }) => setProfile(data ?? null))
  }, [address])

  const userRank = address
    ? rows.findIndex(r => r.address.toLowerCase() === address.toLowerCase()) + 1
    : 0
  const isTop30 = userRank > 0 && userRank <= TOP_N
  const userRow = address ? rows.find(r => r.address.toLowerCase() === address.toLowerCase()) : null

  const top30Score = rows[TOP_N - 1]?.activity_score ?? 0
  const firstScore = rows[0]?.activity_score ?? 1

  const filtered = search.trim()
    ? rows.filter(r => r.address.toLowerCase().includes(search.trim().toLowerCase()))
    : rows

  return (
    <>
    {showRegister && address && (
      <RegisterModal
        walletAddress={address}
        onClose={() => setShowRegister(false)}
        onSuccess={p => { setProfile(p); setShowRegister(false) }}
      />
    )}
    <main className="max-w-5xl mx-auto w-full px-4 py-10 flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⛓️</span>
            <h1 className="text-3xl font-bold tracking-tight">ETH Cali Leaderboard</h1>
            <span className="text-xs bg-blue-900 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full font-medium">Base Network</span>
          </div>
          <p className="text-gray-400 text-sm">
            Onchain activity of users onboarded by{' '}
            <a href="https://ethcali.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ETH Cali</a>
            {' · '}All-time since Base launch (Aug 2023)
            {lastUpdated && (
              <span className="text-gray-600 ml-2">
                · Updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </p>
        </div>
        <ConnectButton />
      </div>

      {/* Wallet status banner */}
      {isConnected && address && (
        <div className={`rounded-xl px-5 py-4 border text-sm ${
          isTop30
            ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
            : userRank > 0
            ? 'bg-blue-950 border-blue-700 text-blue-300'
            : 'bg-gray-900 border-gray-700 text-gray-400'
        }`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl">{isTop30 ? '🏆' : userRank > 0 ? '📊' : '👋'}</span>
            <div className="flex-1 flex flex-wrap items-center gap-3">
              {isTop30 ? (
                <>
                  <span>
                    <strong>You&apos;re #{userRank} on the leaderboard!</strong> You qualify for the ETH Cali OG NFT.
                  </span>
                  {profile
                    ? <span className="text-emerald-400 text-xs">✓ Registered as <strong>{profile.name}</strong></span>
                    : <button onClick={() => setShowRegister(true)} className="text-xs underline font-semibold hover:opacity-80">Register to claim →</button>
                  }
                </>
              ) : userRank > 0 ? (
                <>
                  <span>
                    You&apos;re ranked <strong>#{userRank}</strong> out of {rows.length} users
                    {userRow && (
                      <> · Score: <strong>{fmt(userRow.activity_score)}</strong>
                      {' '}({fmt(top30Score - userRow.activity_score)} pts to top 30)</>
                    )}
                  </span>
                  {profile
                    ? <span className="text-blue-400 text-xs">✓ <strong>{profile.name}</strong></span>
                    : <button onClick={() => setShowRegister(true)} className="text-xs underline font-semibold hover:opacity-80">Register profile →</button>
                  }
                </>
              ) : (
                <span>
                  <strong>{shortAddr(address)}</strong> is not in the ETH Cali dataset yet.
                </span>
              )}
            </div>
          </div>
          {/* Progress bar to top 30 for non-top-30 users */}
          {userRank > TOP_N && userRow && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress to top 30</span>
                <span>{fmt(userRow.activity_score)} / {fmt(top30Score)} pts</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (userRow.activity_score / top30Score) * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Users', value: fmt(rows.length), icon: '👥' },
            { label: 'Top Score', value: fmt(rows[0]?.activity_score ?? 0), icon: '🏆' },
            { label: 'Total Token Volume', value: fmtUsd(rows.reduce((s, r) => s + r.total_token_volume_usd, 0)), icon: '💸' },
            { label: 'Total Transactions', value: fmt(rows.reduce((s, r) => s + r.native_tx_count + r.token_tx_count, 0)), icon: '⚡' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
              <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                <span>{s.icon}</span> {s.label}
              </div>
              <div className="text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* How scoring works */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">How scoring works</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: '🔁', label: 'Native transaction', pts: '1 pt each', desc: 'Any ETH transfer on Base' },
            { icon: '🪙', label: 'Token transfer', pts: '2 pts each', desc: 'ERC-20 token transactions' },
            { icon: '💵', label: 'Token volume', pts: '1 pt / $100', desc: 'USD value of tokens moved' },
            { icon: '📜', label: 'Contract deployed', pts: '3 pts each', desc: 'Smart contracts deployed' },
          ].map(item => (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-semibold text-white">{item.pts}</span>
              </div>
              <div className="text-xs text-gray-400">{item.label}</div>
              <div className="text-xs text-gray-600">{item.desc}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3 border-t border-gray-800 pt-3">
          Timeframe: all-time · Chain: Base (Chain ID 8453) · Data source: Dune Analytics
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Search by wallet address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-gray-500 hover:text-gray-300">
            Clear
          </button>
        )}
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {filtered.length} / {rows.length} users
        </span>
      </div>

      {/* Leaderboard table */}
      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading leaderboard…</div>
      ) : error ? (
        <div className="text-center text-red-400 py-20">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-800 bg-gray-900">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Address</th>
                <th className="px-4 py-3 text-right">Score ↓</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Native Txns</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Token Txns</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Volume (USD)</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Contracts</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const i = rows.indexOf(row)
                const isMe = address && row.address.toLowerCase() === address.toLowerCase()
                const inTop30 = i < TOP_N
                const pctOfFirst = (row.activity_score / firstScore) * 100

                return (
                  <tr
                    key={row.address}
                    className={`border-b border-gray-800 last:border-0 transition-colors ${
                      isMe ? 'bg-blue-950/60' : inTop30 ? 'bg-gray-900/60' : 'hover:bg-gray-900/40'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <a
                        href={`https://basescan.org/address/${row.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {shortAddr(row.address)}
                      </a>
                      {isMe && <span className="ml-2 text-blue-400 text-xs">(you)</span>}
                      {inTop30 && (
                        <span className="ml-2 text-xs text-emerald-600">top 30</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className="relative cursor-help"
                          onMouseEnter={() => setHoveredScore(row.address)}
                          onMouseLeave={() => setHoveredScore(null)}
                        >
                          <span className="font-semibold">{fmt(row.activity_score)}</span>
                          {hoveredScore === row.address && <ScoreTooltip row={row} />}
                        </div>
                        <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${pctOfFirst.toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 hidden sm:table-cell">{fmt(row.native_tx_count)}</td>
                    <td className="px-4 py-3 text-right text-gray-300 hidden sm:table-cell">{fmt(row.token_tx_count)}</td>
                    <td className="px-4 py-3 text-right text-gray-300 hidden md:table-cell">{fmtUsd(row.total_token_volume_usd)}</td>
                    <td className="px-4 py-3 text-right text-gray-300 hidden md:table-cell">{row.contracts_deployed}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="text-center text-gray-600 text-xs pt-2 flex flex-col gap-1">
        <div>
          Built by{' '}
          <a href="https://ethcali.org" className="underline hover:text-gray-400" target="_blank" rel="noopener noreferrer">ETH Cali</a>
          {' · '}Data via{' '}
          <a href="https://dune.com/ethcali" className="underline hover:text-gray-400" target="_blank" rel="noopener noreferrer">Dune Analytics</a>
          {' · '}
          <a href="https://warpcast.com/ethereumcali.eth" className="underline hover:text-gray-400" target="_blank" rel="noopener noreferrer">Farcaster</a>
          {' · '}
          <a href="https://twitter.com/ethcali_org" className="underline hover:text-gray-400" target="_blank" rel="noopener noreferrer">Twitter</a>
        </div>
        {lastUpdated && (
          <div className="text-gray-700">Last data refresh: {new Date(lastUpdated).toUTCString()}</div>
        )}
      </footer>
    </main>
    </>
  )
}
