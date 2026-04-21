'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RegisterModal } from '@/app/components/RegisterModal'
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

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}
function fmtUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtScore(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
function shortAddr(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}
function daysSince(iso: string | null) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

type ClaimState = 'idle' | 'submitted'

// ── Not connected ────────────────────────────────────────────────────────────
function NotConnected() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[#131314] border-b border-[#464652]/20 shadow-[0_10px_30px_-15px_rgba(46,49,146,0.2)]">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-9 h-9 object-contain" />
            <span className="font-[family-name:var(--font-headline)] font-bold text-sm tracking-[0.2em] uppercase text-[#e5e2e3]">ETH CALI</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="flex-grow flex flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-none blur-2xl bg-[#2e3192]/30 scale-110" />
            <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="relative w-28 h-28 object-contain" />
          </div>
          <div>
            <p className="text-[#908f9d] text-xs font-[family-name:var(--font-body)] uppercase tracking-widest mb-3">Identity Protocol</p>
            <h1 className="font-[family-name:var(--font-headline)] text-4xl lg:text-5xl font-extrabold tracking-tight text-[#e5e2e3]">
              IDENTITY <br /><span className="text-[#c0c1ff]">VERIFICATION</span>
            </h1>
            <p className="text-[#908f9d] text-sm mt-4 max-w-xs mx-auto">
              Connect your wallet to check eligibility for the ETH Cali OG NFT.
            </p>
          </div>
        </div>

        <ConnectButton />

        <Link href="/" className="text-xs text-[#464652] hover:text-[#908f9d] font-[family-name:var(--font-body)] tracking-wider transition-colors">
          ← BACK TO LEADERBOARD
        </Link>
      </div>
    </main>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────
function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-[#c0c1ff] to-transparent animate-pulse" />
        <span className="text-[#908f9d] text-xs font-[family-name:var(--font-body)] tracking-[0.3em] uppercase">Scanning chain…</span>
      </div>
    </main>
  )
}

// ── Not eligible ─────────────────────────────────────────────────────────────
function NotEligible({ rank, userRow, top30CutoffScore }: { rank: number; userRow: Row | undefined; top30CutoffScore: number }) {
  const pct = userRow ? Math.min(100, (userRow.activity_score / top30CutoffScore) * 100) : 0
  const gap = top30CutoffScore - (userRow?.activity_score ?? 0)

  return (
    <main className="min-h-screen flex flex-col relative overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[#131314] border-b border-[#464652]/20 shadow-[0_10px_30px_-15px_rgba(46,49,146,0.2)]">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-9 h-9 object-contain" />
            <span className="font-[family-name:var(--font-headline)] font-bold text-sm tracking-[0.2em] uppercase text-[#e5e2e3]">ETH CALI</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="flex-grow flex flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div>
          <p className="text-[#908f9d] text-xs font-[family-name:var(--font-body)] uppercase tracking-widest mb-3">Access Level</p>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl lg:text-5xl font-extrabold tracking-tight text-[#e5e2e3]">
            ACCESS <br /><span className="text-[#ffb4ab]">DENIED</span>
          </h1>
        </div>

        <div className="bg-[#1c1b1c] border border-[#464652]/15 p-8 max-w-sm w-full text-left" style={{ boxShadow: '0 0 30px rgba(46,49,146,0.1)' }}>
          {rank > 0 && userRow ? (
            <>
              <div className="flex justify-between text-xs font-[family-name:var(--font-body)] mb-1">
                <span className="text-[#908f9d] uppercase tracking-wider">Current rank</span>
                <span className="text-[#c0c1ff] font-bold">#{rank}</span>
              </div>
              <div className="flex justify-between text-xs font-[family-name:var(--font-body)] mb-4">
                <span className="text-[#908f9d] uppercase tracking-wider">Score</span>
                <span className="text-[#e5e2e3]">{fmt(userRow.activity_score)} / {fmt(top30CutoffScore)}</span>
              </div>
              <div className="h-px w-full bg-[#464652]/20 mb-4" />
              <div className="h-1 bg-[#0e0e0f] w-full mb-1">
                <div className="h-full bg-gradient-to-r from-[#2e3192] to-[#c0c1ff] transition-all duration-700" style={{ width: `${pct.toFixed(1)}%` }} />
              </div>
              <p className="text-[#908f9d] text-xs mt-3">
                <span className="text-[#ffb4ab] font-bold">{fmt(gap)} pts</span> needed to reach top {TOP_N}
              </p>
            </>
          ) : (
            <p className="text-[#908f9d] text-sm">Your wallet is not in the ETH Cali dataset yet.</p>
          )}
        </div>

        <Link
          href="/"
          className="cyber-gradient text-[#0e0e0f] font-[family-name:var(--font-headline)] font-bold text-sm uppercase tracking-[0.2em] py-3 px-8 hover:shadow-[0_0_30px_rgba(46,49,146,0.6)] transition-all duration-300"
        >
          ← View Leaderboard
        </Link>
      </div>
    </main>
  )
}

// ── Main claim page ───────────────────────────────────────────────────────────
export default function ClaimPage() {
  const { address, isConnected } = useAccount()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [claimState, setClaimState] = useState<ClaimState>('idle')

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(
          `https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results?limit=500`,
          { headers: { 'X-Dune-API-Key': DUNE_API_KEY } }
        )
        const data = await res.json()
        setRows(data.result?.rows ?? [])
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

  if (!isConnected) return <NotConnected />
  if (loading) return <Loading />

  const rank = address
    ? rows.findIndex(r => r.address.toLowerCase() === address.toLowerCase()) + 1
    : 0
  const isTop30 = rank > 0 && rank <= TOP_N
  const userRow = address ? rows.find(r => r.address.toLowerCase() === address.toLowerCase()) : null
  const top30CutoffScore = rows[TOP_N - 1]?.activity_score ?? 0

  if (!isTop30) return <NotEligible rank={rank} userRow={userRow ?? undefined} top30CutoffScore={top30CutoffScore} />

  const rankLabel = rank === 1 ? '#01' : rank === 2 ? '#02' : rank === 3 ? '#03' : `#${String(rank).padStart(2, '0')}`
  const days = daysSince(userRow?.first_tx_time ?? null)
  const trustScore = Math.min(100, Math.round((userRow?.activity_score ?? 0) / Math.max(1, rows[0]?.activity_score) * 100))

  return (
    <>
      {showRegister && address && (
        <RegisterModal
          walletAddress={address}
          onClose={() => setShowRegister(false)}
          onSuccess={p => { setProfile(p); setShowRegister(false) }}
        />
      )}

      <main className="min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#131314] border-b border-[#464652]/20 shadow-[0_10px_30px_-15px_rgba(46,49,146,0.2)]">
          <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
            <Link href="/" className="flex items-center gap-4 group">
              <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-9 h-9 object-contain" />
              <span className="font-[family-name:var(--font-headline)] font-bold text-sm tracking-[0.2em] uppercase text-[#e5e2e3]">ETH CALI</span>
            </Link>
            <ConnectButton />
          </div>
        </header>

        {/* Hero label */}
        <div className="px-6 pt-12 pb-6 max-w-7xl mx-auto w-full">
          <p className="text-[#908f9d] text-xs font-[family-name:var(--font-body)] uppercase tracking-widest mb-2">Identity Protocol</p>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl lg:text-5xl font-extrabold tracking-tight text-[#e5e2e3]">
            IDENTITY <br /><span className="text-[#c0c1ff]">VERIFICATION</span>
          </h1>
          <p className="text-[#908f9d] text-xs font-[family-name:var(--font-body)] uppercase tracking-widest mt-2">
            Initialize your cypher profile.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex-grow px-6 pb-16 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">

          {/* Left: Tactical ID Card */}
          <section className="lg:col-span-2 flex flex-col gap-8">
            <div className="relative bg-[#1c1b1c] border border-[#464652]/15 p-8 overflow-hidden group" style={{ boxShadow: '0 0 30px rgba(46,49,146,0.1)' }}>

              {/* ETH watermark */}
              <div className="absolute -right-10 -bottom-10 w-56 h-56 opacity-[0.06] pointer-events-none transition-transform duration-1000 group-hover:scale-105 flex items-center justify-center">
                <img src="/branding/Open SEA - Ethereum Cali3.png" alt="" className="w-full h-full object-contain" />
              </div>

              {/* Status badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {claimState === 'submitted' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-pulse" />
                    <span className="font-[family-name:var(--font-body)] text-xs tracking-widest uppercase font-bold text-[#c0c1ff]">Claimed</span>
                  </>
                ) : profile ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#c0c1ff]" />
                    <span className="font-[family-name:var(--font-body)] text-xs tracking-widest uppercase font-bold text-[#c0c1ff]">Verified</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#908f9d]" />
                    <span className="font-[family-name:var(--font-body)] text-xs tracking-widest uppercase text-[#908f9d]">Pending</span>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-8 relative z-10">
                {/* Avatar + address */}
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-[#201f20] border border-[#464652]/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-[family-name:var(--font-headline)] text-2xl font-black text-[#c0c1ff]">
                      {rankLabel}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-wider">Target Address</span>
                    <span className="font-[family-name:var(--font-body)] text-[#e5e2e3] text-sm break-all">
                      {address ? shortAddr(address) : '—'}
                    </span>
                    {profile?.name && (
                      <span className="font-[family-name:var(--font-headline)] text-base font-bold text-[#c0c1ff]">{profile.name}</span>
                    )}
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-px bg-[#464652]/15">
                  <div className="bg-[#1c1b1c] p-4 flex flex-col gap-1">
                    <span className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-widest">Native Txns</span>
                    <span className="font-[family-name:var(--font-headline)] text-xl font-bold text-[#e5e2e3]">{userRow ? fmt(userRow.native_tx_count) : '—'}</span>
                  </div>
                  <div className="bg-[#1c1b1c] p-4 flex flex-col gap-1">
                    <span className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-widest">Volume (USD)</span>
                    <span className="font-[family-name:var(--font-headline)] text-xl font-bold text-[#e5e2e3]">{userRow ? fmtScore(Math.round(userRow.total_token_volume_usd)) : '—'}</span>
                  </div>
                  <div className="bg-[#1c1b1c] p-4 flex flex-col gap-1">
                    <span className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-widest">Chain Age</span>
                    <span className="font-[family-name:var(--font-headline)] text-xl font-bold text-[#e5e2e3]">{days > 0 ? `${days}d` : '—'}</span>
                  </div>
                  <div className="bg-[#1c1b1c] p-4 flex flex-col gap-1">
                    <span className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-widest">Trust Score</span>
                    <span className="font-[family-name:var(--font-headline)] text-xl font-bold text-[#e5e2e3]">{trustScore}/100</span>
                  </div>
                </div>

                {/* Activity score bar */}
                {userRow && (
                  <div>
                    <div className="flex justify-between text-[10px] font-[family-name:var(--font-body)] uppercase tracking-wider text-[#908f9d] mb-2">
                      <span>Activity Score</span>
                      <span className="text-[#c0c1ff] font-bold">{fmtScore(userRow.activity_score)}</span>
                    </div>
                    <div className="h-px w-full bg-[#0e0e0f]">
                      <div
                        className="h-full bg-gradient-to-r from-[#2e3192] to-[#c0c1ff]"
                        style={{ width: `${trustScore}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Score breakdown */}
            {userRow && (
              <div className="bg-[#0e0e0f] border border-[#464652]/15 p-6">
                <p className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-widest mb-4">Score Breakdown</p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Native Txns ×1', value: userRow.native_tx_count, pts: userRow.native_tx_count },
                    { label: 'Token Txns ×2', value: userRow.token_tx_count, pts: userRow.token_tx_count * 2 },
                    { label: 'Volume /100', value: Math.round(userRow.total_token_volume_usd), pts: Math.round(userRow.total_token_volume_usd / 100) },
                    { label: 'Contracts ×3', value: userRow.contracts_deployed, pts: userRow.contracts_deployed * 3 },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#464652]/20" />
                      <span className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-wider w-32 text-right">{s.label}</span>
                      <span className="font-[family-name:var(--font-headline)] text-sm font-bold text-[#c0c1ff] w-14 text-right">+{fmt(s.pts)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right: Claim / Registration Panel */}
          <section className="lg:col-span-3 mt-2 lg:mt-0">
            {!profile ? (
              /* Not registered — registration prompt */
              <div className="bg-[#353436]/60 backdrop-blur-[20px] border border-[#464652]/15 p-8 lg:p-12 flex flex-col gap-10">
                <div className="flex flex-col gap-2">
                  <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-[#e5e2e3] tracking-wide uppercase">Claim Parameters</h2>
                  <div className="h-px w-16 bg-[#2e3192]" />
                  <p className="text-[#908f9d] text-sm font-[family-name:var(--font-body)] mt-2">
                    You&apos;re <span className="text-[#c0c1ff] font-bold">{rankLabel}</span> on the leaderboard. Register your profile to claim your ETH Cali OG NFT.
                  </p>
                </div>

                <div className="flex flex-col gap-6 text-sm font-[family-name:var(--font-body)] text-[#908f9d]">
                  {[
                    { label: 'Alias / Name', note: 'required' },
                    { label: 'Encrypted Comms (Email)', note: 'optional' },
                    { label: 'X / Twitter Handle', note: 'optional' },
                    { label: 'Telegram ID', note: 'optional' },
                  ].map(f => (
                    <div key={f.label} className="flex items-end gap-4">
                      <div className="flex-1 border-b border-[#464652]/40 py-2 flex justify-between">
                        <span className="text-xs uppercase tracking-widest">{f.label}</span>
                        <span className="text-[10px] text-[#464652] uppercase tracking-wider">{f.note}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowRegister(true)}
                  className="w-full cyber-gradient text-[#0e0e0f] font-[family-name:var(--font-headline)] font-bold text-lg uppercase tracking-[0.2em] py-5 px-8 hover:shadow-[0_0_30px_rgba(46,49,146,0.6)] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <span className="text-xl">◈</span>
                  INITIATE_CLAIM
                </button>
              </div>
            ) : claimState === 'submitted' ? (
              /* Claim submitted confirmation */
              <div className="bg-[#353436]/60 backdrop-blur-[20px] border border-[#464652]/15 p-8 lg:p-12 flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-[#e5e2e3] tracking-wide uppercase">Claim Submitted</h2>
                  <div className="h-px w-16 bg-[#2e3192]" />
                </div>

                <div className="bg-[#1c1b1c] border border-[#c0c1ff]/20 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-pulse" />
                    <span className="font-[family-name:var(--font-body)] text-xs uppercase tracking-widest text-[#c0c1ff]">Transmission received</span>
                  </div>
                  <p className="font-[family-name:var(--font-body)] text-[#908f9d] text-sm">
                    The ETH Cali team will verify and mint your OG NFT to{' '}
                    <span className="font-mono text-[#e5e2e3]">{address ? shortAddr(address) : '—'}</span>.
                    NFTs are minted manually — follow us for updates.
                  </p>
                  <a
                    href="https://twitter.com/ethcali_org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#c0c1ff] hover:text-[#e1e0ff] underline font-[family-name:var(--font-body)] tracking-wider uppercase"
                  >
                    @ethcali_org →
                  </a>
                </div>

                {/* Profile summary */}
                <div className="flex flex-col gap-4">
                  <p className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-widest">Registered Profile</p>
                  <div className="flex flex-col gap-3 text-sm font-[family-name:var(--font-body)]">
                    {profile.email && (
                      <div className="flex justify-between border-b border-[#464652]/15 pb-3">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">Email</span>
                        <span className="text-[#e5e2e3]">{profile.email}</span>
                      </div>
                    )}
                    {profile.x_username && (
                      <div className="flex justify-between border-b border-[#464652]/15 pb-3">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">X</span>
                        <a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">@{profile.x_username}</a>
                      </div>
                    )}
                    {profile.telegram_handle && (
                      <div className="flex justify-between border-b border-[#464652]/15 pb-3">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">Telegram</span>
                        <span className="text-[#e5e2e3]">@{profile.telegram_handle}</span>
                      </div>
                    )}
                    {profile.country_code && (
                      <div className="flex justify-between">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">Country</span>
                        <span className="text-[#e5e2e3]">{profile.country_code}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Registered, ready to claim */
              <div className="bg-[#353436]/60 backdrop-blur-[20px] border border-[#464652]/15 p-8 lg:p-12 flex flex-col gap-10">
                <div className="flex flex-col gap-2">
                  <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-[#e5e2e3] tracking-wide uppercase">Claim Parameters</h2>
                  <div className="h-px w-16 bg-[#2e3192]" />
                </div>

                {/* Profile summary */}
                <div className="flex flex-col gap-4">
                  <p className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-widest">Registered Profile</p>
                  <div className="flex flex-col gap-3 text-sm font-[family-name:var(--font-body)]">
                    <div className="flex justify-between border-b border-[#464652]/15 pb-3">
                      <span className="text-[#908f9d] text-xs uppercase tracking-wider">Alias</span>
                      <span className="text-[#e5e2e3] font-bold">{profile.name}</span>
                    </div>
                    {profile.email && (
                      <div className="flex justify-between border-b border-[#464652]/15 pb-3">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">Email</span>
                        <span className="text-[#e5e2e3]">{profile.email}</span>
                      </div>
                    )}
                    {profile.x_username && (
                      <div className="flex justify-between border-b border-[#464652]/15 pb-3">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">X</span>
                        <a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">@{profile.x_username}</a>
                      </div>
                    )}
                    {profile.telegram_handle && (
                      <div className="flex justify-between border-b border-[#464652]/15 pb-3">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">Telegram</span>
                        <span className="text-[#e5e2e3]">@{profile.telegram_handle}</span>
                      </div>
                    )}
                    {profile.country_code && (
                      <div className="flex justify-between">
                        <span className="text-[#908f9d] text-xs uppercase tracking-wider">Country</span>
                        <span className="text-[#e5e2e3]">{profile.country_code}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Target wallet */}
                <div className="bg-[#0e0e0f] border border-[#464652]/15 p-5 flex flex-col gap-2">
                  <span className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-widest">Destination Wallet</span>
                  <span className="font-mono text-[#e5e2e3] text-sm break-all">{address}</span>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setClaimState('submitted')}
                    className="w-full cyber-gradient text-[#0e0e0f] font-[family-name:var(--font-headline)] font-bold text-lg uppercase tracking-[0.2em] py-5 px-8 hover:shadow-[0_0_30px_rgba(46,49,146,0.6)] transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">◈</span>
                    INITIATE_CLAIM
                  </button>
                  <p className="text-center text-xs text-[#464652] font-[family-name:var(--font-body)] tracking-wider">
                    NFTs are minted manually by the ETH Cali team.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Back link */}
        <div className="px-6 pb-10 max-w-7xl mx-auto w-full">
          <Link href="/" className="text-xs text-[#464652] hover:text-[#908f9d] font-[family-name:var(--font-body)] tracking-wider transition-colors">
            ← BACK TO LEADERBOARD
          </Link>
        </div>
      </main>
    </>
  )
}
