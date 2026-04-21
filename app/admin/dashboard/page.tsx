'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''

const CHAINS = [
  { key: 'base',     label: 'Base',     logo: '/chains/base logo.svg',  queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_BASE     ?? '6634911' },
  { key: 'ethereum', label: 'Ethereum', logo: '/chains/ethereum.png',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM ?? '' },
  { key: 'optimism', label: 'Optimism', logo: '/chains/op mainnet.png', queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM ?? '' },
  { key: 'polygon',  label: 'Polygon',  logo: '/chains/polygon.png',    queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON  ?? '' },
  { key: 'gnosis',   label: 'Gnosis',   logo: '/chains/gnosis.png',     queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS   ?? '' },
  { key: 'unichain', label: 'Unichain', logo: '/chains/unichain.png',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN ?? '' },
]

type ChainStats = { wallets: number; topScore: number; totalTxns: number; lastUpdated: string }
type Stat = { label: string; value: number; sub?: string; sym: string; href?: string }

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
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
      { label: 'POAP Events',      value: poapCount ?? 0,    sym: '◉', href: '/admin/sources', sub: 'tracked events' },
      { label: 'NFT Contracts',    value: nftCount ?? 0,     sym: '⬡', href: '/admin/sources', sub: 'on-chain sources' },
      { label: 'Unique Addresses', value: datasetCount ?? 0, sym: '◈', href: '/admin/dataset', sub: 'in dataset' },
      { label: 'Registered Users', value: usersCount ?? 0,   sym: '◇', href: '/admin/users',   sub: 'filled the form' },
    ])
    setLoading(false)
    loadAllChains()
  }

  async function loadAllChains() {
    const initial: Record<string, boolean> = {}
    CHAINS.forEach(c => { initial[c.key] = !!c.queryId })
    setChainLoading(initial)

    await Promise.all(CHAINS.map(async c => {
      if (!c.queryId) { setChainStats(prev => ({ ...prev, [c.key]: null })); return }
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
    setSyncing(true); setSyncMsg(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      setSyncMsg({ ok: true, text: `Sync complete — ${data.total.toLocaleString()} unique addresses` })
      loadSupabase()
    } catch {
      setSyncMsg({ ok: false, text: 'Sync failed — check server logs' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-8 flex flex-col gap-10 max-w-6xl">

      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em] mb-2">// master_control_node</p>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl font-extrabold text-[#e5e2e3] uppercase tracking-tight">
            System <br /><span className="text-[#c0c1ff]">Reconciliation</span>
          </h1>
          {lastSync && (
            <p className="font-[family-name:var(--font-body)] text-[10px] text-[#464652] uppercase tracking-wider mt-3">
              Last sync: {new Date(lastSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={runSync} disabled={syncing}
          className="cyber-gradient disabled:opacity-50 text-[#0e0e0f] font-[family-name:var(--font-headline)] font-bold text-sm uppercase tracking-[0.2em] px-8 py-4 hover:shadow-[0_0_20px_rgba(46,49,146,0.5)] transition-all flex items-center gap-3"
        >
          <span className={syncing ? 'animate-spin' : ''}>⟳</span>
          {syncing ? 'SYNCING…' : 'EXECUTE_SYNC'}
        </button>
      </div>

      {/* Sync message */}
      {syncMsg && (
        <div className={`border p-4 font-[family-name:var(--font-body)] text-sm ${syncMsg.ok ? 'border-[#c0c1ff]/20 bg-[#2e3192]/10 text-[#c0c1ff]' : 'border-[#ffb4ab]/20 bg-[#93000a]/10 text-[#ffb4ab]'}`}>
          <span className="text-[10px] uppercase tracking-widest mr-3">{syncMsg.ok ? '✓' : '✕'}</span>
          {syncMsg.text}
        </div>
      )}

      {/* Dataset KPI cards */}
      <section>
        <p className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-[0.25em] mb-4">// Dataset Nodes</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#1c1b1c] border border-[#464652]/15 p-6 h-28 animate-pulse" />
          )) : stats.map(s => (
            <Link
              key={s.label}
              href={s.href ?? '#'}
              className="bg-[#1c1b1c] border border-[#464652]/15 p-5 flex flex-col gap-2 relative overflow-hidden group hover:bg-[#201f20] transition-colors"
              style={{ boxShadow: 'inset 0 0 0 0 rgba(46,49,146,0)' }}
            >
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#c0c1ff] opacity-30" />
              <div className="flex justify-between items-start">
                <span className="font-[family-name:var(--font-body)] text-[9px] text-[#908f9d] uppercase tracking-widest">{s.label}</span>
                <span className="text-[#c0c1ff]/30 text-base">{s.sym}</span>
              </div>
              <div className="font-[family-name:var(--font-headline)] text-3xl font-bold text-[#e5e2e3]">{fmt(s.value)}</div>
              <div className="h-px w-full bg-[#464652]/20" />
              <p className="font-[family-name:var(--font-body)] text-[9px] text-[#908f9d] uppercase tracking-wider">{s.sub}</p>
              <div className="absolute bottom-0 left-0 w-full h-0.5 cyber-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </section>

      {/* Per-chain stats */}
      <section>
        <p className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-[0.25em] mb-4">// Multi-Chain Event Matrix</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHAINS.map(c => {
            const cs = chainStats[c.key]
            const isLoading = chainLoading[c.key]
            const hasQuery = !!c.queryId

            return (
              <div
                key={c.key}
                className="bg-[#1c1b1c] border border-[#464652]/15 p-5 flex flex-col gap-4 relative group hover:bg-[#201f20] transition-colors"
              >
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#c0c1ff] opacity-20 group-hover:opacity-50 transition-opacity" />

                {/* Chain label */}
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logo} alt={c.label} className="w-6 h-6 object-contain" />
                  <span className="font-[family-name:var(--font-headline)] text-sm font-bold text-[#e5e2e3] uppercase tracking-widest">{c.label}</span>
                  {!hasQuery && (
                    <span className="ml-auto font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-widest border border-[#464652]/30 px-2 py-0.5">soon</span>
                  )}
                </div>

                <div className="h-px w-full bg-[#464652]/20" />

                {!hasQuery ? (
                  <p className="font-[family-name:var(--font-body)] text-[10px] text-[#464652] leading-relaxed">
                    Set <code className="text-[#908f9d]">NEXT_PUBLIC_DUNE_QUERY_ID_{c.key.toUpperCase()}</code> env var.
                  </p>
                ) : isLoading ? (
                  <div className="flex flex-col gap-2 animate-pulse">
                    <div className="h-4 bg-[#2a2a2b] w-2/3" />
                    <div className="h-3 bg-[#2a2a2b] w-1/2" />
                    <div className="h-3 bg-[#2a2a2b] w-3/4" />
                  </div>
                ) : cs === null ? (
                  <p className="font-[family-name:var(--font-body)] text-[10px] text-[#ffb4ab] uppercase tracking-wider">Failed — check query ID</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Active wallets', value: fmt(cs.wallets) },
                      { label: 'Top score',      value: fmt(cs.topScore), accent: true },
                      { label: 'Total txns',     value: fmt(cs.totalTxns) },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center">
                        <span className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-wider">{row.label}</span>
                        <span className={`font-[family-name:var(--font-headline)] text-sm font-bold ${row.accent ? 'text-[#c0c1ff]' : 'text-[#e5e2e3]'}`}>{row.value}</span>
                      </div>
                    ))}
                    {cs.lastUpdated && (
                      <p className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-wider pt-2 border-t border-[#464652]/15">
                        Updated {new Date(cs.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <p className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-[0.25em] mb-4">// Control Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/admin/sources', sym: '⬡', label: 'Add POAP event or NFT contract' },
            { href: '/admin/top30',   sym: '⚡', label: 'Review top-30 eligibility & NFT mint' },
            { href: '/admin/dataset', sym: '◈', label: 'Browse & export unique addresses' },
            { href: '/admin/users',   sym: '◇', label: 'View registered user profiles' },
          ].map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="bg-[#1c1b1c] border border-[#464652]/15 px-4 py-3 flex items-center gap-3 font-[family-name:var(--font-body)] text-xs text-[#908f9d] hover:text-[#c0c1ff] hover:bg-[#201f20] transition-all uppercase tracking-wider"
            >
              <span className="text-[#c0c1ff]/40">{l.sym}</span>
              {l.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
