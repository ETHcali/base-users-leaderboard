'use client'

import { useEffect, useState } from 'react'
import { supabase, type UserProfile } from '@/lib/supabase'

const DUNE_QUERY_ID = '6634911'
const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY ?? ''
const TOP_N = 30

type DuneRow = {
  address: string
  activity_score: number
  native_tx_count: number
  token_tx_count: number
  total_token_volume_usd: number
  contracts_deployed: number
}

type Status = 'registered' | 'in-dataset' | 'unknown'

type Top30Row = DuneRow & {
  rank: number
  status: Status
  profile: UserProfile | null
  inDataset: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}
function fmtUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const STATUS_META: Record<Status, { label: string; color: string; dot: string }> = {
  'registered':  { label: 'Registered',  color: 'text-emerald-400', dot: 'bg-emerald-400' },
  'in-dataset':  { label: 'In dataset',  color: 'text-blue-400',    dot: 'bg-blue-400' },
  'unknown':     { label: 'Unknown',     color: 'text-gray-500',    dot: 'bg-gray-600' },
}

function exportCsv(rows: Top30Row[]) {
  const header = 'rank,address,score,status,name,email,x_username,telegram,whatsapp,country'
  const body = rows.map(r =>
    [r.rank, r.address, r.activity_score, r.status,
     r.profile?.name ?? '', r.profile?.email ?? '',
     r.profile?.x_username ?? '', r.profile?.telegram_handle ?? '',
     r.profile?.whatsapp ?? '', r.profile?.country_code ?? ''].join(',')
  ).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'top30.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function Top30Page() {
  const [rows, setRows] = useState<Top30Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | 'all'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [duneRes, { data: users }, { data: dataset }] = await Promise.all([
      fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results?limit=500`, {
        headers: { 'X-Dune-API-Key': DUNE_API_KEY },
      }).then(r => r.json()),
      supabase.from('users').select('*'),
      supabase.from('dataset_addresses').select('address'),
    ])

    const duneRows: DuneRow[] = duneRes?.result?.rows ?? []
    const top30 = duneRows.slice(0, TOP_N)

    const userMap = new Map((users ?? []).map(u => [u.wallet_address.toLowerCase(), u]))
    const datasetSet = new Set((dataset ?? []).map(d => d.address.toLowerCase()))

    const enriched: Top30Row[] = top30.map((row, i) => {
      const addr = row.address.toLowerCase()
      const profile = userMap.get(addr) ?? null
      const inDataset = datasetSet.has(addr)
      const status: Status = profile ? 'registered' : inDataset ? 'in-dataset' : 'unknown'
      return { ...row, rank: i + 1, status, profile, inDataset }
    })

    setRows(enriched)
    setLoading(false)
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const medals = ['🥇', '🥈', '🥉']

  const counts = {
    registered: rows.filter(r => r.status === 'registered').length,
    'in-dataset': rows.filter(r => r.status === 'in-dataset').length,
    unknown: rows.filter(r => r.status === 'unknown').length,
  }

  return (
    <div className="p-8 flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Top 30 — OG NFT Eligibility</h1>
          <p className="text-gray-400 text-sm mt-1">Reconcile Dune leaderboard with registered users and dataset</p>
        </div>
        <button
          onClick={() => exportCsv(rows)}
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(counts) as [Status, number][]).map(([s, c]) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`bg-gray-900 border rounded-xl px-4 py-3 text-left transition-colors ${filter === s ? 'border-gray-600' : 'border-gray-800 hover:border-gray-700'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
              <span className="text-gray-400 text-xs">{STATUS_META[s].label}</span>
            </div>
            <div className={`text-2xl font-bold ${STATUS_META[s].color}`}>{c}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading Dune + Supabase data…</div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-800 bg-gray-900 text-left">
                <th className="px-3 py-3 w-8">#</th>
                <th className="px-3 py-3">Address</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3 text-right">Score</th>
                <th className="px-3 py-3 text-right">Txns</th>
                <th className="px-3 py-3 text-right">Volume</th>
                <th className="px-3 py-3 text-right">Contracts</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const meta = STATUS_META[r.status]
                return (
                  <tr key={r.address} className={`border-b border-gray-800 last:border-0 ${r.status === 'registered' ? 'bg-emerald-950/20' : ''}`}>
                    <td className="px-3 py-2.5 font-mono text-gray-400">
                      {r.rank <= 3 ? medals[r.rank - 1] : r.rank}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <a href={`https://basescan.org/address/${r.address}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        {r.address.slice(0, 8)}…{r.address.slice(-4)}
                      </a>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`flex items-center gap-1.5 ${meta.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} shrink-0`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-white font-medium whitespace-nowrap">
                      {r.profile?.name ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {r.profile?.email && <span className="text-gray-400">{r.profile.email}</span>}
                        {r.profile?.x_username && (
                          <a href={`https://x.com/${r.profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            @{r.profile.x_username}
                          </a>
                        )}
                        {r.profile?.telegram_handle && <span className="text-gray-400">@{r.profile.telegram_handle}</span>}
                        {!r.profile && <span className="text-gray-600">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-white">{fmt(r.activity_score)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-300">{fmt(r.native_tx_count + r.token_tx_count)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-300">{fmtUsd(r.total_token_volume_usd)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-300">{r.contracts_deployed}</td>
                    <td className="px-3 py-2.5">
                      {r.profile?.email ? (
                        <a
                          href={`mailto:${r.profile.email}?subject=ETH Cali OG NFT&body=Hi ${r.profile.name}, you are ranked #${r.rank} and eligible for the ETH Cali OG NFT! Please confirm your wallet ${r.address} to receive it.`}
                          className="text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-300 rounded-lg px-2 py-1 transition-colors whitespace-nowrap"
                        >
                          ✉ Send claim
                        </a>
                      ) : (
                        <span className="text-gray-700 text-xs">No email</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
