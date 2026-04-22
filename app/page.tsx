'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { RegisterModal } from './components/RegisterModal'
import { Navbar } from './components/Navbar'
import { supabase, type UserProfile } from '@/lib/supabase'

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''
const TOP_N = 30

type ChainKey = 'all' | 'base' | 'ethereum' | 'optimism' | 'polygon' | 'gnosis' | 'unichain'

const CHAINS = [
  { key: 'base',     label: 'Base',     logo: '/chains/base logo.svg',    queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_BASE     ?? '6634911', explorer: 'https://basescan.org/address/' },
  { key: 'ethereum', label: 'ETH',      logo: '/chains/ethereum.png',     queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM ?? '',        explorer: 'https://etherscan.io/address/' },
  { key: 'optimism', label: 'OP',       logo: '/chains/op mainnet.png',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM ?? '',        explorer: 'https://optimistic.etherscan.io/address/' },
  { key: 'polygon',  label: 'Polygon',  logo: '/chains/polygon.png',      queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON  ?? '',        explorer: 'https://polygonscan.com/address/' },
  { key: 'gnosis',   label: 'Gnosis',   logo: '/chains/gnosis.png',       queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS   ?? '',        explorer: 'https://gnosisscan.io/address/' },
  { key: 'unichain', label: 'Unichain', logo: '/chains/unichain.png',     queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN ?? '',        explorer: 'https://uniscan.xyz/address/' },
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


export default function Home() {
  const { address, isConnected } = useAccount()
  const [activeChain, setActiveChain] = useState<ChainKey>('all')
  const [rowsByChain, setRowsByChain] = useState<Partial<Record<string, Row[]>>>({})
  const [loadingChains, setLoadingChains] = useState<Partial<Record<string, boolean>>>({})
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(30)
  const [sortCol, setSortCol] = useState<keyof Row>('activity_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(col: keyof Row) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  async function fetchChain(key: string) {
    const cfg = CHAINS.find(c => c.key === key)
    if (!cfg?.queryId || rowsByChain[key] !== undefined) return
    setLoadingChains(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetch(
        `https://api.dune.com/api/v1/query/${cfg.queryId}/results?limit=500`,
        { headers: { 'X-Dune-API-Key': DUNE_API_KEY } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rows: Row[] = data.result?.rows ?? []
      setRowsByChain(prev => ({ ...prev, [key]: rows }))
    } catch {
      setRowsByChain(prev => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingChains(prev => ({ ...prev, [key]: false }))
    }
  }

  useEffect(() => {
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

  const sortedFiltered = (sortCol === 'activity_score' && sortDir === 'desc')
    ? filtered
    : [...filtered].sort((a, b) => {
        const av = (a[sortCol] ?? 0) as number
        const bv = (b[sortCol] ?? 0) as number
        return sortDir === 'desc' ? bv - av : av - bv
      })
  const visibleRows = sortedFiltered.slice(0, visibleCount)

  return (
    <>
      {showRegister && address && (
        <RegisterModal
          walletAddress={address}
          onClose={() => setShowRegister(false)}
          onSuccess={p => { setProfile(p); setShowRegister(false); window.location.href = '/profile' }}
        />
      )}

      <Navbar />

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
            {/* All Chains tab */}
            <button
              onClick={() => { setActiveChain('all'); setVisibleCount(30); setSearch('') }}
              className={`flex items-center gap-2 px-4 py-2 font-label text-xs uppercase tracking-widest transition-all ${
                activeChain === 'all' ? 'bg-[#2e3192] text-[#c0c1ff]' : 'text-[#c7c5d4]/50 hover:text-[#c0c1ff] hover:bg-[#2e3192]/20'
              }`}
              style={activeChain === 'all' ? { boxShadow: '0 0 20px rgba(46,49,146,0.4)' } : {}}
            >
              <span className="text-sm">◈</span>
              <span className="hidden sm:inline">All</span>
            </button>
            {CHAINS.map(c => {
              const isActive = activeChain === c.key
              const isAvail = !!c.queryId
              return (
                <button
                  key={c.key}
                  onClick={() => { setActiveChain(c.key as ChainKey); setVisibleCount(30); setSearch('') }}
                  disabled={!isAvail}
                  className={`flex items-center gap-2 px-3 py-2 font-label text-xs uppercase tracking-widest transition-all ${
                    isActive
                      ? 'bg-[#2e3192] text-[#c0c1ff]'
                      : isAvail
                      ? 'text-[#c7c5d4]/50 hover:text-[#c0c1ff] hover:bg-[#2e3192]/20'
                      : 'text-[#464652] cursor-not-allowed opacity-40'
                  }`}
                  style={isActive ? { boxShadow: '0 0 20px rgba(46,49,146,0.4)' } : {}}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logo} alt={c.label} className="w-4 h-4 object-contain" />
                  <span className="hidden sm:inline">{c.label}</span>
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

        {/* ── ELITE OPERATIVES TABLE ── */}
        <div>
          <div className="space-y-4">
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
                <p className="font-label text-xs text-[#908f9d] uppercase tracking-widest">No operatives found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#464652]/20 text-left">
                      <th className="pb-2 pr-4 w-12 font-label text-[9px] text-[#908f9d] uppercase tracking-widest">#</th>
                      <th className="pb-2 pr-4 font-label text-[9px] text-[#908f9d] uppercase tracking-widest">Address</th>
                      {([
                        { key: 'native_tx_count',       label: 'Txns',       cls: '' },
                        { key: 'token_tx_count',        label: 'Token Txns', cls: 'hidden sm:table-cell' },
                        { key: 'total_token_volume_usd',label: 'Volume',     cls: 'hidden md:table-cell' },
                        { key: 'contracts_deployed',    label: 'Contracts',  cls: 'hidden md:table-cell' },
                        { key: 'activity_score',        label: 'Score',      cls: '' },
                      ] as { key: keyof Row; label: string; cls: string }[]).map(col => (
                        <th key={col.key} onClick={() => toggleSort(col.key)}
                          className={`pb-2 px-2 text-right cursor-pointer select-none ${col.cls}`}>
                          <span className={`font-label text-[9px] uppercase tracking-widest transition-colors ${sortCol === col.key ? 'text-[#c0c1ff]' : 'text-[#908f9d] hover:text-[#e5e2e3]'}`}>
                            {col.label}{sortCol === col.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, i) => {
                      const rank = activeRows.indexOf(row) + 1
                      const isMe = address && row.address.toLowerCase() === address.toLowerCase()
                      const inTop30 = rank <= TOP_N
                      return (
                        <tr key={row.address} className={`border-b border-[#464652]/10 last:border-0 hover:bg-[#201f20] transition-colors border-l-2 ${
                          isMe ? 'bg-[#2e3192]/15 border-[#c0c1ff]' :
                          rank === 1 ? 'bg-[#1c1b1c] border-[#c0c1ff] glow-blue' :
                          `${i % 2 === 0 ? 'bg-[#1c1b1c]' : 'bg-[#0e0e0f]'} border-transparent`
                        }`}>
                          <td className="py-3 pr-4">
                            <span className={`font-headline font-black tabular-nums ${rank <= 3 ? 'text-[#c0c1ff]' : 'text-[#908f9d]'}`}
                              style={rank <= 3 ? { textShadow: '0 0 8px rgba(192,193,255,0.5)' } : {}}>
                              #{String(rank).padStart(2, '0')}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <a href={`${explorerBase}${row.address}`} target="_blank" rel="noopener noreferrer"
                                className="font-body text-sm text-[#e5e2e3] hover:text-[#c0c1ff] transition-colors">
                                {shortAddr(row.address)}
                              </a>
                              {isMe && <span className="font-label text-[9px] text-[#c0c1ff] uppercase tracking-widest border border-[#c0c1ff]/30 px-1.5 py-0.5">you</span>}
                              {inTop30 && !isMe && <span className="font-label text-[9px] text-[#c0c1ff]/40 uppercase">top30</span>}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-body text-sm text-[#e5e2e3] tabular-nums">{fmt(row.native_tx_count)}</td>
                          <td className="py-3 px-2 text-right font-body text-sm text-[#e5e2e3] hidden sm:table-cell tabular-nums">{fmt(row.token_tx_count)}</td>
                          <td className="py-3 px-2 text-right font-body text-sm text-[#e5e2e3] hidden md:table-cell">{fmtUsd(row.total_token_volume_usd)}</td>
                          <td className="py-3 px-2 text-right font-body text-sm text-[#e5e2e3] hidden md:table-cell tabular-nums">{fmt(row.contracts_deployed)}</td>
                          <td className="py-3 pl-2 text-right">
                            <span className="font-headline text-sm font-bold text-[#c0c1ff]">{fmtScore(row.activity_score)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
        </div>

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

    </>
  )
}
