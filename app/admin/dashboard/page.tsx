'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const DUNE_QUERY_ID = '6634911'
const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''

type Stat = { label: string; value: string | number; sub?: string; icon: string; color: string; href?: string }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [
      { count: poapCount },
      { count: nftCount },
      { count: datasetCount },
      { count: usersCount },
      { data: lastAddr },
      duneRes,
    ] = await Promise.all([
      supabase.from('poap_sources').select('*', { count: 'exact', head: true }),
      supabase.from('nft_sources').select('*', { count: 'exact', head: true }),
      supabase.from('dataset_addresses').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('dataset_addresses').select('updated_at').order('updated_at', { ascending: false }).limit(1),
      fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results?limit=1`, {
        headers: { 'X-Dune-API-Key': DUNE_API_KEY },
      }).then(r => r.json()).catch(() => null),
    ])

    const top30Count = await supabase
      .from('users')
      .select('wallet_address')
      .then(async ({ data: us }) => {
        if (!duneRes?.result?.rows || !us) return 0
        const top30 = new Set(duneRes.result.rows.slice(0, 30).map((r: { address: string }) => r.address.toLowerCase()))
        return us.filter(u => top30.has(u.wallet_address.toLowerCase())).length
      })

    setLastSync(lastAddr?.[0]?.updated_at ?? null)
    setStats([
      { label: 'POAP Events',       value: poapCount ?? 0,  icon: '📍', color: 'text-blue-400',    href: '/admin/sources',  sub: 'tracked events' },
      { label: 'NFT Contracts',     value: nftCount ?? 0,   icon: '🪙', color: 'text-purple-400',  href: '/admin/sources',  sub: 'Unlock Protocol' },
      { label: 'Unique Addresses',  value: datasetCount ?? 0, icon: '🗂️', color: 'text-emerald-400', href: '/admin/dataset', sub: 'in dataset' },
      { label: 'Registered Users',  value: usersCount ?? 0, icon: '👥', color: 'text-white',        href: '/admin/users',   sub: 'filled the form' },
      { label: 'Top 30 Registered', value: top30Count,      icon: '🏆', color: 'text-amber-400',    href: '/admin/top30',   sub: 'eligible for OG NFT' },
    ])
    setLoading(false)
  }

  async function runSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      setSyncMsg(`✅ Sync done — ${data.total.toLocaleString()} unique addresses`)
      load()
    } catch {
      setSyncMsg('❌ Sync failed — check console')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-8 flex flex-col gap-8 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            ETH Cali — Base Leaderboard overview
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24" />
        )) : stats.map(s => (
          <Link key={s.label} href={s.href ?? '#'} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 flex flex-col gap-1 transition-colors group">
            <div className="text-gray-500 text-xs flex items-center gap-1.5">
              <span>{s.icon}</span>{s.label}
            </div>
            <div className={`text-3xl font-black ${s.color}`}>{s.value.toLocaleString()}</div>
            <div className="text-gray-600 text-xs">{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
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
  )
}
