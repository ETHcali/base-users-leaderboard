'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''

const CHAINS = [
  { key: 'base',     label: 'Base',     logo: '/chains/base logo.svg', queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_BASE     ?? '6634911', color: 'text-blue-400',   border: 'border-blue-900' },
  { key: 'ethereum', label: 'Ethereum', logo: '/chains/ethereum.png',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM ?? '',       color: 'text-gray-300',   border: 'border-gray-700' },
  { key: 'optimism', label: 'Optimism', logo: '/chains/op mainnet.png', queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM ?? '',        color: 'text-red-400',    border: 'border-red-900' },
  { key: 'polygon',  label: 'Polygon',  logo: '/chains/polygon.png',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON  ?? '',        color: 'text-purple-400', border: 'border-purple-900' },
  { key: 'gnosis',   label: 'Gnosis',   logo: '/chains/gnosis.png',    queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS   ?? '',        color: 'text-emerald-400',border: 'border-emerald-900' },
  { key: 'unichain', label: 'Unichain', logo: '/chains/unichain.png',  queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN ?? '',        color: 'text-pink-400',   border: 'border-pink-900' },
]

type ChainStats = { wallets: number; topScore: number; totalTxns: number; lastUpdated: string }
type Stat = { label: string; value: string | number; sub?: string; icon: string; color: string; href?: string }

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[]>([])
  const [chainStats, setChainStats] = useState<Record<string, ChainStats | null>>({})
  const [chainLoading, setChainLoading] = useState<Record<string, boolean>>({})
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => { loadSupabase() }, [])

  async function loadSupabase() {
    setLoading(true)
    const [
      { count: poapCount },
      { count: nftCount },
      { count: datasetCount },
      { count: usersCount },
      { data: lastAddr },
    ] = await Promise.all([
      supabase.from('poap_sources').select('*', { count: 'exact', head: true }),
      supabase.from('nft_sources').select('*', { count: 'exact', head: true }),
      supabase.from('dataset_addresses').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('dataset_addresses').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    ])
    setLastSync(lastAddr?.[0]?.updated_at ?? null)
    setStats([
      { label: 'POAP Events',       value: poapCount ?? 0,    icon: '📍', color: 'text-blue-400',    href: '/admin/sources',  sub: 'tracked events' },
      { label: 'NFT Contracts',     value: nftCount ?? 0,     icon: '🪙', color: 'text-purple-400',  href: '/admin/sources',  sub: 'Unlock Protocol' },
      { label: 'Unique Addresses',  value: datasetCount ?? 0, icon: '🗂️', color: 'text-emerald-400', href: '/admin/dataset',  sub: 'in dataset' },
      { label: 'Registered Users',  value: usersCount ?? 0,   icon: '👥', color: 'text-white',        href: '/admin/users',   sub: 'filled the form' },
    ])
    setLoading(false)
    loadAllChains()
  }

  async function loadAllChains() {
    const initial: Record<string, boolean> = {}
    CHAINS.forEach(c => { initial[c.key] = !!c.queryId })
    setChainLoading(initial)

    await Promise.all(CHAINS.map(async c => {
      if (!c.queryId) {
        setChainStats(prev => ({ ...prev, [c.key]: null }))
        return
      }
      try {
        const res = await fetch(
          `https://api.dune.com/api/v1/query/${c.queryId}/results?limit=500`,
          { headers: { 'X-Dune-API-Key': DUNE_API_KEY } }
        )
        const data = await res.json()
        const rows: { native_tx_count: number; token_tx_count: number; activity_score: number }[] = data?.result?.rows ?? []
        setChainStats(prev => ({
          ...prev,
          [c.key]: {
            wallets: rows.length,
            topScore: rows[0]?.activity_score ?? 0,
            totalTxns: rows.reduce((s, r) => s + r.native_tx_count + r.token_tx_count, 0),
            lastUpdated: data?.execution_ended_at ?? '',
          },
        }))
      } catch {
        setChainStats(prev => ({ ...prev, [c.key]: null }))
      } finally {
        setChainLoading(prev => ({ ...prev, [c.key]: false }))
      }
    }))
  }

  async function runSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      setSyncMsg(`✅ Sync done — ${data.total.toLocaleString()} unique addresses`)
      loadSupabase()
    } catch {
      setSyncMsg('❌ Sync failed — check console')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-8 flex flex-col gap-8 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            ETH Cali — multi-chain overview
            {lastSync && <span className="text-gray-600 ml-2">· Last sync {new Date(lastSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={runSync} disabled={syncing}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2 flex items-center gap-2 transition-colors"
          >
            {syncing ? <><span className="animate-spin inline-block">⟳</span> Syncing…</> : '🔄 Run sync'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-300">{syncMsg}</div>
      )}

      {/* Dataset KPI cards */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dataset</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24" />
          )) : stats.map(s => (
            <Link key={s.label} href={s.href ?? '#'} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 flex flex-col gap-1 transition-colors">
              <div className="text-gray-500 text-xs flex items-center gap-1.5">
                <span>{s.icon}</span>{s.label}
              </div>
              <div className={`text-3xl font-black ${s.color}`}>{s.value.toLocaleString()}</div>
              <div className="text-gray-600 text-xs">{s.sub}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Per-chain Dune stats */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Leaderboard by chain</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHAINS.map(c => {
            const stats = chainStats[c.key]
            const isLoading = chainLoading[c.key]
            const hasQuery = !!c.queryId

            return (
              <div key={c.key} className={`bg-gray-900 border ${c.border} rounded-xl p-5 flex flex-col gap-3`}>
                <div className="flex items-center gap-2">
                  <Image src={c.logo} alt={c.label} width={20} height={20} className="rounded-sm" />
                  <span className={`font-semibold ${c.color}`}>{c.label}</span>
                  {!hasQuery && (
                    <span className="ml-auto text-xs text-gray-700 bg-gray-800 px-2 py-0.5 rounded-full">soon</span>
                  )}
                </div>

                {!hasQuery ? (
                  <div className="text-xs text-gray-700 py-2">
                    Paste SQL from <code className="text-gray-600">docsdune/queries/{c.key}.sql</code> into Dune,
                    then set <code className="text-gray-600">NEXT_PUBLIC_DUNE_QUERY_ID_{c.key.toUpperCase()}</code>.
                  </div>
                ) : isLoading ? (
                  <div className="flex flex-col gap-2 animate-pulse">
                    <div className="h-6 bg-gray-800 rounded w-2/3" />
                    <div className="h-4 bg-gray-800 rounded w-1/2" />
                    <div className="h-4 bg-gray-800 rounded w-3/4" />
                  </div>
                ) : stats === null ? (
                  <div className="text-xs text-red-400">Failed to load — check query ID</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active wallets</span>
                      <span className="font-bold text-white">{fmt(stats.wallets)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Top score</span>
                      <span className={`font-bold ${c.color}`}>{fmt(stats.topScore)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total txns</span>
                      <span className="font-bold text-white">{fmt(stats.totalTxns)}</span>
                    </div>
                    {stats.lastUpdated && (
                      <div className="text-xs text-gray-700 pt-1 border-t border-gray-800">
                        Updated {new Date(stats.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/admin/sources', icon: '➕', label: 'Add POAP event or NFT contract' },
            { href: '/admin/top30',   icon: '🏅', label: 'Review top-30 eligibility & NFT mint' },
            { href: '/admin/dataset', icon: '📋', label: 'Browse & export unique addresses' },
            { href: '/admin/users',   icon: '✉️', label: 'View registered user profiles' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-300 hover:text-white flex items-center gap-2 transition-colors">
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
