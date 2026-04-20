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

type ClaimState = 'idle' | 'submitted' | 'already_claimed'

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

  const rank = address
    ? rows.findIndex(r => r.address.toLowerCase() === address.toLowerCase()) + 1
    : 0
  const isTop30 = rank > 0 && rank <= TOP_N
  const userRow = address ? rows.find(r => r.address.toLowerCase() === address.toLowerCase()) : null
  const top30CutoffScore = rows[TOP_N - 1]?.activity_score ?? 0

  const medals = ['🥇', '🥈', '🥉']
  const rankLabel = rank <= 3 ? medals[rank - 1] : `#${rank}`

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <img src="/branding/Open SEA - Ethereum Cali3.png" alt="ETH Cali" className="w-24 h-24 rounded-2xl" />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Claim your ETH Cali OG NFT</h1>
          <p className="text-gray-400 text-sm">Connect your wallet to check eligibility</p>
        </div>
        <ConnectButton />
        <Link href="/" className="text-xs text-gray-600 hover:text-gray-400">← Back to leaderboard</Link>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading your onchain data…</div>
      </main>
    )
  }

  if (!isTop30) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="text-5xl">😔</div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Not eligible yet</h1>
          <p className="text-gray-400 text-sm max-w-sm">
            {rank > 0
              ? `You're ranked #${rank}. You need to be in the top ${TOP_N} to claim. ${fmt(top30CutoffScore - (userRow?.activity_score ?? 0))} more points needed.`
              : `Your wallet isn't in the ETH Cali dataset yet.`}
          </p>
        </div>
        <Link
          href="/"
          className="bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors"
        >
          ← View Leaderboard
        </Link>
        {rank > 0 && userRow && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Your score</span>
              <span>{fmt(userRow.activity_score)} / {fmt(top30CutoffScore)} pts</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min(100, (userRow.activity_score / top30CutoffScore) * 100).toFixed(1)}%` }}
              />
            </div>
          </div>
        )}
      </main>
    )
  }

  if (!profile) {
    return (
      <>
        {showRegister && address && (
          <RegisterModal
            walletAddress={address}
            onClose={() => setShowRegister(false)}
            onSuccess={p => { setProfile(p); setShowRegister(false) }}
          />
        )}
        <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="text-5xl">🏆</div>
          <div>
            <h1 className="text-2xl font-bold mb-2">You qualify!</h1>
            <p className="text-gray-400 text-sm">
              You&apos;re <span className="text-emerald-400 font-semibold">{rankLabel}</span> on the leaderboard. Register your profile to claim your ETH Cali OG NFT.
            </p>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-8 py-4 text-base transition-colors shadow-lg shadow-emerald-900/40"
          >
            Register to claim →
          </button>
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400">← Back to leaderboard</Link>
        </main>
      </>
    )
  }

  // Fully verified and registered — show claim card
  const scoreBreakdown = userRow ? [
    { label: 'Native Txns', value: fmt(userRow.native_tx_count), pts: fmt(userRow.native_tx_count * 1), icon: '🔁', color: 'text-blue-400' },
    { label: 'Token Txns', value: fmt(userRow.token_tx_count), pts: fmt(userRow.token_tx_count * 2), icon: '🪙', color: 'text-purple-400' },
    { label: 'Volume (USD)', value: fmtUsd(userRow.total_token_volume_usd), pts: fmt(Math.round(userRow.total_token_volume_usd / 100)), icon: '💸', color: 'text-emerald-400' },
    { label: 'Contracts', value: fmt(userRow.contracts_deployed), pts: fmt(userRow.contracts_deployed * 3), icon: '📜', color: 'text-orange-400' },
  ] : []

  return (
    <main className="max-w-lg mx-auto px-4 py-12 flex flex-col gap-6">

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs text-gray-600 hover:text-gray-400">← Leaderboard</Link>
        <ConnectButton />
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-br from-emerald-950 to-gray-900 border border-emerald-700/50 rounded-2xl p-6 flex flex-col items-center gap-4 text-center shadow-2xl shadow-emerald-950/60">
        <img
          src="/branding/Open SEA - Ethereum Cali3.png"
          alt="ETH Cali OG NFT"
          className="w-28 h-28 rounded-2xl border-2 border-emerald-600/40"
        />
        <div>
          <div className="text-4xl font-black mb-1">{rankLabel}</div>
          <h1 className="text-xl font-bold text-white">{profile.name}</h1>
          <p className="text-emerald-400 text-sm font-medium mt-1">ETH Cali OG — Top {TOP_N} on Base</p>
          <p className="text-gray-500 text-xs mt-1 font-mono">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </p>
        </div>

        {/* Score badge */}
        {userRow && (
          <div className="bg-black/40 rounded-xl px-6 py-3 w-full">
            <div className="text-gray-500 text-xs mb-1">Activity Score</div>
            <div className="text-3xl font-black text-white">{fmt(userRow.activity_score)}</div>
          </div>
        )}
      </div>

      {/* Metrics grid */}
      {userRow && (
        <div className="grid grid-cols-2 gap-3">
          {scoreBreakdown.map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
              <div className="text-gray-500 text-xs flex items-center gap-1">
                <span>{s.icon}</span> {s.label}
              </div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-gray-600 text-xs">+{s.pts} pts</div>
            </div>
          ))}
        </div>
      )}

      {/* Profile info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-2 text-sm">
        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1">Registered Profile</div>
        {profile.email && (
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-300">{profile.email}</span>
          </div>
        )}
        {profile.x_username && (
          <div className="flex justify-between">
            <span className="text-gray-500">X</span>
            <a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@{profile.x_username}</a>
          </div>
        )}
        {profile.telegram_handle && (
          <div className="flex justify-between">
            <span className="text-gray-500">Telegram</span>
            <span className="text-gray-300">@{profile.telegram_handle}</span>
          </div>
        )}
        {profile.country_code && (
          <div className="flex justify-between">
            <span className="text-gray-500">Country</span>
            <span className="text-gray-300">{profile.country_code}</span>
          </div>
        )}
      </div>

      {/* Claim CTA */}
      {claimState === 'idle' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setClaimState('submitted')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl py-4 text-base transition-colors shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
          >
            <span>🏅</span> Claim your ETH Cali OG NFT
          </button>
          <p className="text-center text-xs text-gray-600">
            NFTs are minted manually by the ETH Cali team. Submitting will notify the team.
          </p>
        </div>
      )}

      {claimState === 'submitted' && (
        <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-5 text-center flex flex-col gap-3">
          <div className="text-3xl">🎉</div>
          <div>
            <div className="font-bold text-emerald-300 text-lg">Claim submitted!</div>
            <p className="text-emerald-500 text-sm mt-1">
              The ETH Cali team will verify and mint your OG NFT to <span className="font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>.
            </p>
          </div>
          <a
            href="https://twitter.com/ethcali_org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-400 underline"
          >
            Follow @ethcali_org for updates
          </a>
        </div>
      )}

    </main>
  )
}
