'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { RegisterModal } from './components/RegisterModal'
import { supabase, type UserProfile } from '@/lib/supabase'

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''
const TOP_N = 30

type ChainKey = 'all' | 'base' | 'ethereum' | 'optimism' | 'polygon' | 'gnosis' | 'unichain'

const CHAINS = [
  { key: 'base',     label: 'Base',     queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_BASE     ?? '6634911', explorer: 'https://basescan.org/address/' },
  { key: 'ethereum', label: 'Ethereum', queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM ?? '',        explorer: 'https://etherscan.io/address/' },
  { key: 'optimism', label: 'Optimism', queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM ?? '',        explorer: 'https://optimistic.etherscan.io/address/' },
  { key: 'polygon',  label: 'Polygon',  queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON  ?? '',        explorer: 'https://polygonscan.com/address/' },
  { key: 'gnosis',   label: 'Gnosis',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS   ?? '',        explorer: 'https://gnosisscan.io/address/' },
  { key: 'unichain', label: 'Unichain', queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN ?? '',        explorer: 'https://uniscan.xyz/address/' },
] as const

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

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtScore(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return fmt(n)
}

function LogLine({ time, msg, type = 'info' }: { time: string; msg: string; type?: 'info' | 'warn' | 'ok' }) {
  const color = type === 'warn' ? 'text-[#ffb4ab]' : type === 'ok' ? 'text-[#c0c1ff]' : 'text-[#c0c1ff]'
  return (
    <div className="flex gap-2 text-[#c7c5d4]">
      <span className={`${color} shrink-0`}>[{time}]</span>
      <span>&gt; {msg}</span>
    </div>
  )
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const [activeChain, setActiveChain] = useState<ChainKey>('all')
  const [rowsByChain, setRowsByChain] = useState<Partial<Record<string, Row[]>>>({})
  const [loadingChains, setLoadingChains] = useState<Partial<Record<string, boolean>>>({})
  const [logLines, setLogLines] = useState<{ time: string; msg: string; type?: 'info' | 'warn' | 'ok' }[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(30)

  function addLog(msg: string, type: 'info' | 'warn' | 'ok' = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLogLines(prev => [...prev.slice(-20), { time, msg, type }])
  }

  async function fetchChain(key: string) {
    const cfg = CHAINS.find(c => c.key === key)
    if (!cfg?.queryId || rowsByChain[key] !== undefined) return
    setLoadingChains(prev => ({ ...prev, [key]: true }))
    addLog(`Initializing ${cfg.label} data stream...`)
    try {
      const res = await fetch(
        `https://api.dune.com/api/v1/query/${cfg.queryId}/results?limit=500`,
        { headers: { 'X-Dune-API-Key': DUNE_API_KEY } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rows: Row[] = data.result?.rows ?? []
      setRowsByChain(prev => ({ ...prev, [key]: rows }))
      addLog(`${cfg.label} — ${rows.length} operatives indexed`, 'ok')
    } catch (err) {
      addLog(`WARN: ${cfg.label} endpoint error — ${err}`, 'warn')
      setRowsByChain(prev => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingChains(prev => ({ ...prev, [key]: false }))
    }
  }

  // Load all chains at startup for "All Chains" aggregation
  useEffect(() => {
    addLog('System boot sequence initiated...')
    addLog('Connecting to Dune Analytics relay...')
    CHAINS.forEach(c => { if (c.queryId) fetchChain(c.key) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!address) { setProfile(null); return }
    supabase.from('users').select('*').eq('wallet_address', address.toLowerCase()).maybeSingle()
      .then(({ data }) => setProfile(data ?? null))
  }, [address])

  // Aggregate "All Chains" by deduplicating wallets, keeping best score per address
  const allRows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>()
    for (const chain of CHAINS) {
      for (const row of rowsByChain[chain.key] ?? []) {
        const existing = map.get(row.address)
        if (!existing) {
          map.set(row.address, { ...row })
        } else {
          // Accumulate cross-chain activity
          map.set(row.address, {
            ...existing,
            native_tx_count: existing.native_tx_count + row.native_tx_count,
            token_tx_count: existing.token_tx_count + row.token_tx_count,
            total_token_volume_usd: existing.total_token_volume_usd + row.total_token_volume_usd,
            contracts_deployed: existing.contracts_deployed + row.contracts_deployed,
            activity_score: existing.activity_score + row.activity_score,
          })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.activity_score - a.activity_score)
  }, [rowsByChain])

  const activeRows = activeChain === 'all' ? allRows : (rowsByChain[activeChain] ?? [])
  const isLoadingAny = CHAINS.some(c => loadingChains[c.key])
  const isLoadingCurrent = activeChain === 'all' ? isLoadingAny : !!loadingChains[activeChain]

  const activeChainCfg = CHAINS.find(c => c.key === activeChain)
  const explorerBase = activeChainCfg?.explorer ?? 'https://basescan.org/address/'

  const filtered = search.trim()
    ? activeRows.filter(r => r.address.toLowerCase().includes(search.trim().toLowerCase()))
    : activeRows

  const userRank = address ? activeRows.findIndex(r => r.address.toLowerCase() === address.toLowerCase()) + 1 : 0
  const isTop30 = userRank > 0 && userRank <= TOP_N
  const userRow = address ? activeRows.find(r => r.address.toLowerCase() === address.toLowerCase()) : null
  const top30Score = activeRows[TOP_N - 1]?.activity_score ?? 0

  const totalVolume = activeRows.reduce((s, r) => s + r.total_token_volume_usd, 0)
  const totalContracts = activeRows.reduce((s, r) => s + r.contracts_deployed, 0)
  const totalTxns = activeRows.reduce((s, r) => s + r.native_tx_count + r.token_tx_count, 0)

  const visibleRows = filtered.slice(0, visibleCount)

  return (
    <>
      {showRegister && address && (
        <RegisterModal
          walletAddress={address}
          onClose={() => setShowRegister(false)}
          onSuccess={p => { setProfile(p); setShowRegister(false); window.location.href = '/claim' }}
        />
      )}

      {/* ── HEADER (desktop) ── */}
      <header className="hidden md:flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-[#131314]/90 backdrop-blur-xl border-b border-[#464652]/20"
        style={{ boxShadow: '0 10px 40px -10px rgba(46,49,146,0.2)' }}>
        <div className="flex items-center gap-3">
          <Image src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" width={32} height={32} />
          <span className="font-headline text-lg font-bold tracking-widest uppercase text-[#e5e2e3]">ETH CALI</span>
        </div>
        <nav className="flex gap-6 font-label text-xs uppercase tracking-widest">
          <span className="text-[#c0c1ff] flex items-center gap-1.5" style={{ textShadow: '0 0 12px rgba(192,193,255,0.6)' }}>
            <span>◈</span> Leaderboard
          </span>
          <Link href="/claim" className="text-[#e5e2e3]/40 hover:text-[#c0c1ff] transition-colors flex items-center gap-1.5">
            <span>◇</span> Claim
          </Link>
          <Link href="/admin/dashboard" className="text-[#e5e2e3]/40 hover:text-[#c0c1ff] transition-colors flex items-center gap-1.5">
            <span>◇</span> Terminal
          </Link>
        </nav>
        <ConnectButton />
      </header>

      {/* ── HEADER (mobile) ── */}
      <header className="md:hidden flex justify-between items-center px-5 py-4 sticky top-0 z-50 bg-[#131314]/90 backdrop-blur-xl border-b border-[#464652]/20">
        <div className="flex items-center gap-2">
          <Image src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" width={28} height={28} />
          <span className="font-headline text-base font-bold tracking-widest uppercase text-[#e5e2e3]">ETH CALI</span>
        </div>
        <ConnectButton />
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-10 pb-28 md:pb-10">

        {/* ── TITLE + CHAIN TABS ── */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <p className="font-label text-xs text-[#c7c5d4]/60 uppercase tracking-[0.3em] mb-2">// verified on-chain data stream</p>
            <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-[#e5e2e3] leading-none">
              GLOBAL<br />RANKINGS
            </h1>
          </div>

          {/* Chain tabs */}
          <div className="flex flex-wrap gap-1 bg-[#1c1b1c] p-1 border border-[#464652]/20">
            {[{ key: 'all', label: 'All Chains' }, ...CHAINS].map(c => {
              const isActive = activeChain === c.key
              const isAvail = c.key === 'all' || !!(CHAINS.find(ch => ch.key === c.key)?.queryId)
              return (
                <button
                  key={c.key}
                  onClick={() => { setActiveChain(c.key as ChainKey); setVisibleCount(30); setSearch('') }}
                  disabled={!isAvail}
                  className={`px-4 py-2 font-label text-xs uppercase tracking-widest transition-all ${
                    isActive
                      ? 'bg-[#2e3192] text-[#c0c1ff]'
                      : isAvail
                      ? 'text-[#c7c5d4]/50 hover:text-[#c0c1ff] hover:bg-[#2e3192]/20'
                      : 'text-[#464652] cursor-not-allowed'
                  }`}
                  style={isActive ? { boxShadow: '0 0 20px rgba(46,49,146,0.4)' } : {}}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── WALLET BANNER ── */}
        {isConnected && address && activeRows.length > 0 && (
          <div className={`border p-5 relative overflow-hidden ${
            isTop30
              ? 'border-[#c0c1ff]/40 bg-[#2e3192]/10'
              : userRank > 0
              ? 'border-[#464652]/40 bg-[#1c1b1c]'
              : 'border-[#464652]/20 bg-[#1c1b1c]'
          }`} style={isTop30 ? { boxShadow: '0 0 40px rgba(46,49,146,0.2)' } : {}}>
            {isTop30 && <div className="absolute top-0 left-0 w-full h-0.5 cyber-gradient" />}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`font-headline text-4xl font-black ${isTop30 ? 'text-[#c0c1ff] text-glow' : 'text-[#e5e2e3]/30'}`}>
                  {userRank > 0 ? `#${String(userRank).padStart(2, '0')}` : '--'}
                </div>
                <div>
                  <p className="font-label text-xs text-[#c7c5d4]/60 uppercase tracking-widest mb-1">
                    {isTop30 ? 'Elite Operative — OG NFT Eligible' : userRank > 0 ? 'Operative Detected' : 'Identity Unverified'}
                  </p>
                  <p className="font-body text-sm text-[#e5e2e3]">{shortAddr(address)}</p>
                  {userRow && (
                    <p className="font-label text-xs text-[#c7c5d4]/60 mt-0.5">
                      Score: <span className="text-[#c0c1ff]">{fmtScore(userRow.activity_score)}</span>
                      {!isTop30 && userRank > 0 && <span className="ml-2">· {fmtScore(top30Score - userRow.activity_score)} pts to top 30</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isTop30 && (
                  profile
                    ? <Link href="/claim" className="cyber-gradient font-label text-xs uppercase tracking-widest px-6 py-3 text-[#1e2084] font-bold transition-all hover:opacity-90" style={{ boxShadow: '0 0 20px rgba(46,49,146,0.4)' }}>
                        Claim OG NFT →
                      </Link>
                    : <button onClick={() => setShowRegister(true)} className="border border-[#c0c1ff]/40 text-[#c0c1ff] font-label text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#2e3192]/20 transition-all">
                        Register to Claim
                      </button>
                )}
                {userRank > TOP_N && userRow && (
                  <div className="hidden sm:block w-40">
                    <div className="flex justify-between font-label text-xs text-[#c7c5d4]/50 mb-1">
                      <span>Progress</span>
                      <span>{Math.min(100, Math.round((userRow.activity_score / top30Score) * 100))}%</span>
                    </div>
                    <div className="h-0.5 bg-[#464652]/40 w-full">
                      <div className="h-full cyber-gradient transition-all" style={{ width: `${Math.min(100, (userRow.activity_score / top30Score) * 100).toFixed(1)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── METRIC CARDS ── */}
        {activeRows.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Volume', value: fmtUsd(totalVolume), icon: '◈', accent: true },
              { label: 'Active Operatives', value: fmt(activeRows.length), icon: '◉', accent: false },
              { label: 'Contracts Deployed', value: fmt(totalContracts), icon: '⬡', accent: false },
              { label: 'Total Transactions', value: fmt(totalTxns), icon: '⚡', accent: false },
            ].map((card, i) => (
              <div key={card.label} className={`bg-[#1c1b1c] border border-[#464652]/15 p-5 relative overflow-hidden group hover:bg-[#201f20] transition-colors ${card.accent ? 'glow-blue' : ''}`}>
                <div className="absolute top-2 right-2 text-[#c0c1ff]/30 text-lg">{card.icon}</div>
                <p className="font-label text-[10px] text-[#c7c5d4]/60 uppercase tracking-[0.2em] mb-3">{card.label}</p>
                <p className={`font-headline text-2xl font-bold ${card.accent ? 'text-[#c0c1ff]' : 'text-[#e5e2e3]'}`}>{card.value}</p>
                {card.accent && <div className="absolute bottom-0 left-0 w-full h-0.5 cyber-gradient" />}
                <div className="absolute bottom-0 left-0 w-full h-0.5 cyber-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </section>
        )}

        {/* ── MAIN GRID: TABLE + LOG ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ELITE OPERATIVES TABLE */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#464652]/20">
              <h2 className="font-headline text-sm text-[#c0c1ff] uppercase tracking-[0.25em]" style={{ textShadow: '0 0 12px rgba(192,193,255,0.4)' }}>
                Elite Operatives
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search address..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setVisibleCount(30) }}
                  className="bg-[#1c1b1c] border-b border-[#464652]/40 px-3 py-1.5 font-label text-xs text-[#e5e2e3] placeholder-[#464652] focus:outline-none focus:border-[#c0c1ff]/60 w-44 transition-colors"
                />
                <span className="font-label text-[10px] text-[#c7c5d4]/40 uppercase tracking-widest">
                  {filtered.length} / {activeRows.length}
                </span>
              </div>
            </div>

            {isLoadingCurrent ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#1c1b1c] border border-[#464652]/10 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-label text-xs text-[#464652] uppercase tracking-widest">No operatives found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleRows.map((row, i) => {
                  const rank = activeRows.indexOf(row) + 1
                  const isMe = address && row.address.toLowerCase() === address.toLowerCase()
                  const inTop30 = rank <= TOP_N
                  const winRate = activeRows[0]?.activity_score
                    ? Math.round((row.activity_score / activeRows[0].activity_score) * 100)
                    : 0
                  const isAlt = i % 2 === 0

                  return (
                    <div
                      key={row.address}
                      className={`flex items-center justify-between p-4 transition-all group border-l-2 ${
                        isMe
                          ? 'bg-[#2e3192]/15 border-[#c0c1ff]'
                          : rank === 1
                          ? 'bg-[#1c1b1c] border-[#c0c1ff] glow-blue'
                          : inTop30
                          ? `${isAlt ? 'bg-[#1c1b1c]' : 'bg-[#0e0e0f]'} border-transparent hover:border-[#464652]/40`
                          : `${isAlt ? 'bg-[#1c1b1c]' : 'bg-[#0e0e0f]'} border-transparent hover:border-[#464652]/20`
                      } hover:bg-[#201f20]`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`font-headline font-black text-lg w-10 tabular-nums ${
                          rank <= 3 ? 'text-[#c0c1ff]' : 'text-[#464652]'
                        }`} style={rank <= 3 ? { textShadow: '0 0 8px rgba(192,193,255,0.5)' } : {}}>
                          #{String(rank).padStart(2, '0')}
                        </span>
                        <div className="w-9 h-9 bg-[#2a2a2b] border border-[#464652]/20 flex items-center justify-center shrink-0">
                          <span className="text-[#c7c5d4]/60 text-xs">◈</span>
                        </div>
                        <div>
                          <a
                            href={`${explorerBase}${row.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-sm text-[#e5e2e3] hover:text-[#c0c1ff] transition-colors"
                          >
                            {shortAddr(row.address)}
                          </a>
                          {isMe && <span className="ml-2 font-label text-[10px] text-[#c0c1ff] uppercase tracking-widest">you</span>}
                          <p className="font-label text-[10px] text-[#c7c5d4]/50 mt-0.5">
                            Score: {fmtScore(row.activity_score)}
                            {inTop30 && <span className="ml-2 text-[#c0c1ff]/60">· top 30</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                          <p className="font-label text-[10px] text-[#c7c5d4]/40 uppercase tracking-widest">Volume</p>
                          <p className="font-body text-sm text-[#e5e2e3]">{fmtUsd(row.total_token_volume_usd)}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="font-label text-[10px] text-[#c7c5d4]/40 uppercase tracking-widest">Activity</p>
                          <p className="font-body text-sm text-[#e5e2e3]">{winRate}%</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount(v => v + 30)}
                className="w-full py-4 border border-[#464652]/20 text-[#c0c1ff] font-label text-xs uppercase tracking-widest hover:bg-[#2e3192]/10 transition-colors"
              >
                Load More Data — {filtered.length - visibleCount} remaining
              </button>
            )}
          </div>

          {/* SYSTEM LOG */}
          <div className="bg-[#1c1b1c] border border-[#464652]/15 p-6 relative flex flex-col min-h-[400px]">
            <div className="absolute top-2 right-2 text-[#c0c1ff]/20 text-base">⊡</div>
            <h3 className="font-headline text-xs text-[#e5e2e3] uppercase tracking-[0.25em] mb-4 pb-3 border-b border-[#464652]/20">
              System Log
            </h3>
            <div className="flex-grow space-y-2.5 font-label text-[11px] overflow-y-auto pr-1">
              {logLines.map((l, i) => (
                <LogLine key={i} time={l.time} msg={l.msg} type={l.type} />
              ))}
              <div className="flex gap-2 text-[#c7c5d4]/30">
                <span className="text-[#c0c1ff]/40 shrink-0">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="animate-pulse">_ Awaiting input...</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#464652]/20">
              <div className="flex items-center gap-2 font-label text-[10px] text-[#c7c5d4]/40 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[#c0c1ff]" style={{ boxShadow: '0 0 6px #c0c1ff' }} />
                {isLoadingAny ? 'Syncing chains...' : 'System Online'}
              </div>
            </div>
          </div>
        </div>

        {/* ── SCORE FORMULA ── */}
        <section className="border border-[#464652]/15 bg-[#1c1b1c] p-6">
          <p className="font-label text-[10px] text-[#c7c5d4]/40 uppercase tracking-[0.25em] mb-4">// Score Protocol</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { action: 'Native Transaction', pts: '1 pt each' },
              { action: 'Token Transfer', pts: '2 pts each' },
              { action: '$100 Token Volume', pts: '1 pt' },
              { action: 'Contract Deployed', pts: '3 pts each' },
            ].map(s => (
              <div key={s.action} className="flex flex-col gap-1">
                <p className="font-headline text-lg font-bold text-[#c0c1ff]">{s.pts}</p>
                <p className="font-label text-[10px] text-[#c7c5d4]/50 uppercase tracking-widest">{s.action}</p>
              </div>
            ))}
          </div>
          <p className="font-label text-[10px] text-[#464652] uppercase tracking-widest mt-4 pt-4 border-t border-[#464652]/20">
            Data: Dune Analytics · All-time · {activeChain === 'all' ? 'All EVM chains aggregated' : `Chain: ${CHAINS.find(c => c.key === activeChain)?.label ?? activeChain}`}
          </p>
        </section>

        {/* ── FOOTER ── */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 font-label text-[10px] text-[#464652] uppercase tracking-widest pt-4 border-t border-[#464652]/15">
          <div className="flex gap-6">
            <a href="https://ethcali.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">ETH Cali</a>
            <a href="https://dune.com/ethcali" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Dune Analytics</a>
            <a href="https://warpcast.com/ethereumcali.eth" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Farcaster</a>
            <a href="https://twitter.com/ethcali_org" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Twitter</a>
          </div>
          <span>Node: Verified · Protocol: v2.0</span>
        </footer>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex h-20 bg-[#0e0e0f]/95 backdrop-blur-xl border-t border-[#c0c1ff]/10"
        style={{ boxShadow: '0 -10px 40px rgba(46,49,146,0.15)' }}>
        <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-[#2e3192]/60 to-transparent text-[#c0c1ff]">
          <span className="text-lg">◈</span>
          <span className="font-label text-[9px] uppercase tracking-widest">Leaderboard</span>
        </Link>
        <Link href="/claim" className="flex-1 flex flex-col items-center justify-center gap-1 text-[#e5e2e3]/30 hover:text-[#c0c1ff] transition-colors">
          <span className="text-lg">◇</span>
          <span className="font-label text-[9px] uppercase tracking-widest">Claim</span>
        </Link>
        <Link href="/admin/dashboard" className="flex-1 flex flex-col items-center justify-center gap-1 text-[#e5e2e3]/30 hover:text-[#c0c1ff] transition-colors">
          <span className="text-lg">⊡</span>
          <span className="font-label text-[9px] uppercase tracking-widest">Terminal</span>
        </Link>
        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-[#e5e2e3]/30">
          <ConnectButton />
        </div>
      </nav>
    </>
  )
}
