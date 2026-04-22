'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { supabase, type UserProfile } from '@/lib/supabase'
import { RegisterModal } from '../components/RegisterModal'
import { Navbar } from '../components/Navbar'

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''
const TOP_N = 30

const CHAINS = [
  { key: 'base',     label: 'Base',     logo: '/chains/base logo.svg',  queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_BASE     ?? '6634911', explorer: 'https://basescan.org/address/' },
  { key: 'ethereum', label: 'ETH',      logo: '/chains/ethereum.png',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM ?? '', explorer: 'https://etherscan.io/address/' },
  { key: 'optimism', label: 'OP',       logo: '/chains/op mainnet.png', queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM ?? '', explorer: 'https://optimistic.etherscan.io/address/' },
  { key: 'polygon',  label: 'Polygon',  logo: '/chains/polygon.png',    queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON  ?? '', explorer: 'https://polygonscan.com/address/' },
  { key: 'gnosis',   label: 'Gnosis',   logo: '/chains/gnosis.png',     queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS   ?? '', explorer: 'https://gnosisscan.io/address/' },
  { key: 'unichain', label: 'Unichain', logo: '/chains/unichain.png',   queryId: process.env.NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN ?? '', explorer: 'https://uniscan.xyz/address/' },
] as const

type ChainRow = {
  native_tx_count: number
  token_tx_count: number
  total_token_volume_usd: number
  contracts_deployed: number
  activity_score: number
  first_tx_time: string | null
  rank: number
  topScore: number
}

function fmt(n: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) }
function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${fmt(n)}`
}
function fmtScore(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return fmt(n)
}
function daysSince(iso: string | null) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [inDataset, setInDataset] = useState<boolean | null>(null)
  const [chainData, setChainData] = useState<Record<string, ChainRow | null>>({})
  const [loadingChains, setLoadingChains] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [claimState, setClaimState] = useState<'idle' | 'submitted'>('idle')

  useEffect(() => {
    if (!address) { setProfile(null); setInDataset(null); setChainData({}); return }
    const lc = address.toLowerCase()

    supabase.from('users').select('*').eq('wallet_address', lc).maybeSingle()
      .then(({ data }) => setProfile(data ?? null))

    supabase.from('dataset_addresses').select('address').eq('address', lc).maybeSingle()
      .then(({ data }) => setInDataset(!!data))

    fetchChainMetrics(lc)
  }, [address]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchChainMetrics(lc: string) {
    setLoadingChains(true)
    await Promise.all(CHAINS.map(async c => {
      if (!c.queryId) { setChainData(prev => ({ ...prev, [c.key]: null })); return }
      try {
        const res = await fetch(
          `https://api.dune.com/api/v1/query/${c.queryId}/results?limit=500`,
          { headers: { 'X-Dune-API-Key': DUNE_API_KEY } }
        )
        const data = await res.json()
        const rows: (ChainRow & { address: string })[] = data?.result?.rows ?? []
        const sorted = [...rows].sort((a, b) => b.activity_score - a.activity_score)
        const idx = sorted.findIndex(r => r.address?.toLowerCase() === lc)
        if (idx === -1) { setChainData(prev => ({ ...prev, [c.key]: null })); return }
        setChainData(prev => ({
          ...prev,
          [c.key]: { ...sorted[idx], rank: idx + 1, topScore: sorted[0]?.activity_score ?? 0 },
        }))
      } catch {
        setChainData(prev => ({ ...prev, [c.key]: null }))
      }
    }))
    setLoadingChains(false)
  }

  const activeChains = CHAINS.filter(c => chainData[c.key] != null)
  const baseData = chainData['base']
  const isBaseTop30 = !!baseData && baseData.rank <= TOP_N
  const rankLabel = baseData ? `#${String(baseData.rank).padStart(2, '0')}` : '--'
  const trustScore = baseData ? Math.min(100, Math.round((baseData.activity_score / Math.max(1, baseData.topScore)) * 100)) : 0
  const days = baseData ? daysSince(baseData.first_tx_time ?? null) : 0

  return (
    <>
      {showRegister && address && (
        <RegisterModal
          walletAddress={address}
          onClose={() => setShowRegister(false)}
          onSuccess={p => { setProfile(p); setShowRegister(false) }}
        />
      )}

      <Navbar />

      <main className="flex-grow w-full max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-8 pb-28 md:pb-10">

        {/* Title */}
        <section>
          <p className="font-label text-xs text-[#c7c5d4]/60 uppercase tracking-[0.3em] mb-2">// operative_profile</p>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-[#e5e2e3] leading-none">
            YOUR<br /><span className="text-[#c0c1ff]">PROFILE</span>
          </h1>
        </section>

        {/* Not connected */}
        {!isConnected && (
          <div className="border border-[#464652]/30 bg-[#1c1b1c] p-8 text-center space-y-4">
            <p className="font-label text-xs text-[#908f9d] uppercase tracking-widest">Connect your wallet to view your profile</p>
            <ConnectButton />
          </div>
        )}

        {isConnected && address && (
          <>
            {/* Wallet + dataset status */}
            <section className="bg-[#1c1b1c] border border-[#464652]/20 p-5 flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="font-label text-[10px] text-[#908f9d] uppercase tracking-widest mb-1">Wallet</p>
                <p className="font-mono text-[#e5e2e3] text-sm break-all">{address}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {inDataset === true && <span className="font-label text-[9px] uppercase tracking-widest border border-[#c0c1ff]/30 text-[#c0c1ff] px-2 py-1">In Dataset</span>}
                {inDataset === false && <span className="font-label text-[9px] uppercase tracking-widest border border-[#464652]/40 text-[#908f9d] px-2 py-1">Not in Dataset</span>}
                {isBaseTop30 && <span className="font-label text-[9px] uppercase tracking-widest border border-[#c0c1ff]/30 text-[#c0c1ff] px-2 py-1 bg-[#2e3192]/20">OG Eligible</span>}
              </div>
            </section>

            {/* Registration */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-label text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em]">// registration_data</p>
                {profile
                  ? <button onClick={() => setShowRegister(true)} className="font-label text-[9px] text-[#464652] hover:text-[#c0c1ff] uppercase tracking-widest transition-colors border border-[#464652]/30 hover:border-[#c0c1ff]/30 px-3 py-1.5">Edit Info</button>
                  : <button onClick={() => setShowRegister(true)} className="cyber-gradient text-[#0e0e0f] font-label font-bold text-[9px] uppercase tracking-widest px-4 py-2">Register</button>
                }
              </div>
              {profile ? (
                <div className="bg-[#1c1b1c] border border-[#464652]/15 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Name', value: profile.name },
                    { label: 'Email', value: profile.email || '—' },
                    { label: 'X / Twitter', value: profile.x_username ? `@${profile.x_username}` : '—' },
                    { label: 'Telegram', value: profile.telegram_handle ? `@${profile.telegram_handle}` : '—' },
                    { label: 'WhatsApp', value: profile.whatsapp || '—' },
                    { label: 'Country', value: profile.country_code || '—' },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-0.5">
                      <p className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest">{f.label}</p>
                      <p className="font-body text-sm text-[#e5e2e3]">{f.value}</p>
                    </div>
                  ))}
                  <div className="col-span-full pt-3 border-t border-[#464652]/15">
                    <p className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest">
                      Registered {profile.registered_at ? new Date(profile.registered_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1c1b1c] border border-[#464652]/15 p-6 text-center space-y-2">
                  <p className="font-label text-xs text-[#908f9d] uppercase tracking-widest">Not registered yet</p>
                  <p className="font-body text-sm text-[#908f9d]">Register to be eligible for the ETH Cali OG NFT and appear in the community directory.</p>
                </div>
              )}
            </section>

            {/* Per-chain metrics */}
            <section className="space-y-3">
              <p className="font-label text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em]">// on_chain_metrics</p>
              {loadingChains ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CHAINS.map(c => <div key={c.key} className="bg-[#1c1b1c] border border-[#464652]/15 p-5 h-40 animate-pulse" />)}
                </div>
              ) : activeChains.length === 0 ? (
                <div className="bg-[#1c1b1c] border border-[#464652]/15 p-6 text-center">
                  <p className="font-label text-xs text-[#908f9d] uppercase tracking-widest">No activity found in the leaderboard dataset</p>
                  <p className="font-body text-sm text-[#908f9d] mt-2">Your wallet may not be in the dataset yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CHAINS.map(c => {
                    const d = chainData[c.key]
                    if (!d) return null
                    const top30 = c.key === 'base' && d.rank <= TOP_N
                    return (
                      <div key={c.key} className={`border p-5 flex flex-col gap-3 transition-colors ${top30 ? 'bg-[#2e3192]/10 border-[#c0c1ff]/30' : 'bg-[#1c1b1c] border-[#464652]/15 hover:bg-[#201f20]'}`}
                        style={top30 ? { boxShadow: '0 0 20px rgba(46,49,146,0.15)' } : {}}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.logo} alt={c.label} className="w-5 h-5 object-contain" />
                          <span className="font-headline text-sm font-bold text-[#e5e2e3] uppercase">{c.label}</span>
                          {top30 && <span className="font-label text-[9px] text-[#c0c1ff] border border-[#c0c1ff]/30 px-1.5 py-0.5 uppercase tracking-widest">OG Eligible</span>}
                          <a href={`${c.explorer}${address}`} target="_blank" rel="noopener noreferrer"
                            className="ml-auto font-label text-[9px] text-[#464652] hover:text-[#c0c1ff] transition-colors">↗</a>
                        </div>
                        <div className="h-px bg-[#464652]/20" />
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Rank',       value: `#${d.rank}`,                    accent: true },
                            { label: 'Score',      value: fmtScore(d.activity_score),       accent: true },
                            { label: 'Txns',       value: fmt(d.native_tx_count) },
                            { label: 'Token Txns', value: fmt(d.token_tx_count) },
                            { label: 'Volume',     value: fmtUsd(d.total_token_volume_usd) },
                            { label: 'Contracts',  value: fmt(d.contracts_deployed) },
                          ].map(m => (
                            <div key={m.label} className="flex flex-col gap-0.5">
                              <p className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest">{m.label}</p>
                              <p className={`font-headline text-sm font-bold ${m.accent ? 'text-[#c0c1ff]' : 'text-[#e5e2e3]'}`}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── OG NFT CLAIM — shown only for Base top 30 ── */}
            {isBaseTop30 && baseData && (
              <section className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#c0c1ff]/20" />
                  <p className="font-label text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em]">// og_nft_claim</p>
                  <div className="h-px flex-1 bg-[#c0c1ff]/20" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                  {/* Left: Tactical ID Card */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="relative bg-[#1c1b1c] border border-[#464652]/15 p-6 overflow-hidden" style={{ boxShadow: '0 0 30px rgba(46,49,146,0.1)' }}>
                      {/* Watermark */}
                      <div className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.06] pointer-events-none">
                        <Image src="/branding/Open SEA - Ethereum Cali3.png" alt="" fill className="object-contain" />
                      </div>

                      {/* Status badge */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        {claimState === 'submitted' ? (
                          <><span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-pulse" /><span className="font-label text-[10px] uppercase tracking-widest text-[#c0c1ff]">Claimed</span></>
                        ) : profile ? (
                          <><span className="w-2 h-2 rounded-full bg-[#c0c1ff]" /><span className="font-label text-[10px] uppercase tracking-widest text-[#c0c1ff]">Verified</span></>
                        ) : (
                          <><span className="w-2 h-2 rounded-full bg-[#908f9d]" /><span className="font-label text-[10px] uppercase tracking-widest text-[#908f9d]">Pending</span></>
                        )}
                      </div>

                      <div className="flex flex-col gap-5 relative z-10">
                        {/* Rank + address */}
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-[#201f20] border border-[#464652]/20 flex items-center justify-center shrink-0">
                            <span className="font-headline text-xl font-black text-[#c0c1ff]">{rankLabel}</span>
                          </div>
                          <div>
                            <p className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest mb-1">Base · OG Elite</p>
                            {profile?.name && <p className="font-headline text-base font-bold text-[#c0c1ff]">{profile.name}</p>}
                          </div>
                        </div>

                        {/* Metrics grid */}
                        <div className="grid grid-cols-2 gap-px bg-[#464652]/15">
                          {[
                            { label: 'Native Txns',  value: fmt(baseData.native_tx_count) },
                            { label: 'Volume (USD)',  value: fmtScore(Math.round(baseData.total_token_volume_usd)) },
                            { label: 'Chain Age',     value: days > 0 ? `${days}d` : '—' },
                            { label: 'Trust Score',   value: `${trustScore}/100` },
                          ].map(m => (
                            <div key={m.label} className="bg-[#1c1b1c] p-3 flex flex-col gap-0.5">
                              <p className="font-label text-[9px] text-[#c0c1ff] uppercase tracking-widest">{m.label}</p>
                              <p className="font-headline text-lg font-bold text-[#e5e2e3]">{m.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Score bar */}
                        <div>
                          <div className="flex justify-between font-label text-[9px] uppercase tracking-widest text-[#908f9d] mb-1">
                            <span>Activity Score</span>
                            <span className="text-[#c0c1ff] font-bold">{fmtScore(baseData.activity_score)}</span>
                          </div>
                          <div className="h-px w-full bg-[#0e0e0f]">
                            <div className="h-full cyber-gradient" style={{ width: `${trustScore}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="bg-[#0e0e0f] border border-[#464652]/15 p-5">
                      <p className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest mb-3">Score Breakdown</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Native Txns ×1',  pts: baseData.native_tx_count },
                          { label: 'Token Txns ×2',   pts: baseData.token_tx_count * 2 },
                          { label: 'Volume /100',      pts: Math.round(baseData.total_token_volume_usd / 100) },
                          { label: 'Contracts ×3',    pts: baseData.contracts_deployed * 3 },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-[#464652]/20" />
                            <span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">{s.label}</span>
                            <span className="font-headline text-xs font-bold text-[#c0c1ff] w-12 text-right">+{fmt(s.pts)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Claim panel */}
                  <div className="lg:col-span-3">
                    {claimState === 'submitted' ? (
                      <div className="bg-[#353436]/60 border border-[#464652]/15 p-8 flex flex-col gap-6 h-full">
                        <div>
                          <h2 className="font-headline text-xl font-bold text-[#e5e2e3] uppercase">Claim Submitted</h2>
                          <div className="h-px w-12 bg-[#2e3192] mt-2" />
                        </div>
                        <div className="bg-[#1c1b1c] border border-[#c0c1ff]/20 p-5 flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-pulse" />
                            <span className="font-label text-[9px] uppercase tracking-widest text-[#c0c1ff]">Transmission received</span>
                          </div>
                          <p className="font-body text-sm text-[#908f9d]">
                            The ETH Cali team will verify and mint your OG NFT. NFTs are minted manually — follow us for updates.
                          </p>
                          <a href="https://twitter.com/ethcali_org" target="_blank" rel="noopener noreferrer"
                            className="font-label text-[9px] text-[#c0c1ff] hover:underline uppercase tracking-wider">@ethcali_org →</a>
                        </div>
                        {profile && (
                          <div className="flex flex-col gap-2 text-sm font-body">
                            {profile.email && <div className="flex justify-between border-b border-[#464652]/15 pb-2"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">Email</span><span className="text-[#e5e2e3]">{profile.email}</span></div>}
                            {profile.x_username && <div className="flex justify-between border-b border-[#464652]/15 pb-2"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">X</span><a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">@{profile.x_username}</a></div>}
                            {profile.telegram_handle && <div className="flex justify-between"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">Telegram</span><span className="text-[#e5e2e3]">@{profile.telegram_handle}</span></div>}
                          </div>
                        )}
                      </div>
                    ) : !profile ? (
                      <div className="bg-[#353436]/60 border border-[#464652]/15 p-8 flex flex-col gap-6 h-full">
                        <div>
                          <h2 className="font-headline text-xl font-bold text-[#e5e2e3] uppercase">Claim Parameters</h2>
                          <div className="h-px w-12 bg-[#2e3192] mt-2" />
                          <p className="font-body text-sm text-[#908f9d] mt-3">
                            You&apos;re <span className="text-[#c0c1ff] font-bold">{rankLabel}</span> on Base. Register your profile to claim your ETH Cali OG NFT.
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 text-sm font-body text-[#908f9d]">
                          {[
                            { label: 'Alias / Name', note: 'required' },
                            { label: 'Encrypted Comms (Email)', note: 'optional' },
                            { label: 'X / Twitter Handle', note: 'optional' },
                            { label: 'Telegram ID', note: 'optional' },
                          ].map(f => (
                            <div key={f.label} className="flex justify-between border-b border-[#464652]/40 py-2">
                              <span className="font-label text-[9px] uppercase tracking-widest">{f.label}</span>
                              <span className="font-label text-[9px] text-[#464652] uppercase tracking-wider">{f.note}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setShowRegister(true)}
                          className="w-full cyber-gradient text-[#0e0e0f] font-headline font-bold text-base uppercase tracking-[0.2em] py-4 hover:shadow-[0_0_30px_rgba(46,49,146,0.6)] transition-all flex items-center justify-center gap-3">
                          <span>◈</span> INITIATE_CLAIM
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#353436]/60 border border-[#464652]/15 p-8 flex flex-col gap-6 h-full">
                        <div>
                          <h2 className="font-headline text-xl font-bold text-[#e5e2e3] uppercase">Claim Parameters</h2>
                          <div className="h-px w-12 bg-[#2e3192] mt-2" />
                        </div>
                        <div className="flex flex-col gap-2 text-sm font-body">
                          <div className="flex justify-between border-b border-[#464652]/15 pb-2"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">Alias</span><span className="text-[#e5e2e3] font-bold">{profile.name}</span></div>
                          {profile.email && <div className="flex justify-between border-b border-[#464652]/15 pb-2"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">Email</span><span className="text-[#e5e2e3]">{profile.email}</span></div>}
                          {profile.x_username && <div className="flex justify-between border-b border-[#464652]/15 pb-2"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">X</span><a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">@{profile.x_username}</a></div>}
                          {profile.telegram_handle && <div className="flex justify-between border-b border-[#464652]/15 pb-2"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">Telegram</span><span className="text-[#e5e2e3]">@{profile.telegram_handle}</span></div>}
                          {profile.country_code && <div className="flex justify-between"><span className="font-label text-[9px] text-[#908f9d] uppercase tracking-wider">Country</span><span className="text-[#e5e2e3]">{profile.country_code}</span></div>}
                        </div>
                        <div className="bg-[#0e0e0f] border border-[#464652]/15 p-4">
                          <p className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest mb-1">Destination Wallet</p>
                          <p className="font-mono text-[#e5e2e3] text-sm break-all">{address}</p>
                        </div>
                        <div className="flex flex-col gap-2 mt-auto">
                          <button onClick={() => setClaimState('submitted')}
                            className="w-full cyber-gradient text-[#0e0e0f] font-headline font-bold text-base uppercase tracking-[0.2em] py-4 hover:shadow-[0_0_30px_rgba(46,49,146,0.6)] transition-all flex items-center justify-center gap-3">
                            <span>◈</span> INITIATE_CLAIM
                          </button>
                          <p className="text-center font-label text-[9px] text-[#908f9d] uppercase tracking-wider">NFTs are minted manually by the ETH Cali team</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <Link href="/" className="inline-block border border-[#464652]/40 text-[#908f9d] hover:text-[#c0c1ff] hover:border-[#c0c1ff]/30 font-label text-xs uppercase tracking-widest px-5 py-3 transition-colors">
              ← Back to Leaderboard
            </Link>
          </>
        )}

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 font-label text-[10px] text-[#464652] uppercase tracking-widest pt-4 border-t border-[#464652]/15">
          <div className="flex gap-6">
            <a href="https://ethcali.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">ETH Cali</a>
            <a href="https://dune.com/ethcali" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Dune Analytics</a>
          </div>
          <span>Node: Verified · Protocol: v2.0</span>
        </footer>
      </main>

    </>
  )
}
