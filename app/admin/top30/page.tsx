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
  'registered':  { label: 'Registered',  color: 'text-[#c0c1ff]',  dot: 'bg-[#c0c1ff]' },
  'in-dataset':  { label: 'In dataset',  color: 'text-[#908f9d]',  dot: 'bg-[#908f9d]' },
  'unknown':     { label: 'Unknown',     color: 'text-[#464652]',  dot: 'bg-[#464652]' },
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
    <div className="p-8 flex flex-col gap-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em] mb-2">// og_nft_eligibility</p>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl font-extrabold text-[#e5e2e3] uppercase tracking-tight">Top 30</h1>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#464652] uppercase tracking-wider mt-2">
            Dune leaderboard × registered users × dataset
          </p>
        </div>
        <button onClick={() => exportCsv(rows)}
          className="cyber-gradient text-[#0e0e0f] font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-[0.2em] px-6 py-3 hover:shadow-[0_0_20px_rgba(46,49,146,0.5)] transition-all">
          ⬇ Export CSV
        </button>
      </div>

      {/* Status filters */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(counts) as [Status, number][]).map(([s, c]) => {
          const meta = STATUS_META[s]
          return (
            <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`bg-[#1c1b1c] border p-4 text-left transition-colors relative group ${filter === s ? 'border-[#c0c1ff]/30' : 'border-[#464652]/15 hover:border-[#464652]/40'}`}>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#c0c1ff] opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-1.5 ${meta.dot}`} />
                <span className={`font-[family-name:var(--font-body)] text-[9px] uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
              </div>
              <div className={`font-[family-name:var(--font-headline)] text-3xl font-bold ${meta.color}`}>{c}</div>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center font-[family-name:var(--font-body)] text-[#908f9d] text-xs uppercase tracking-widest py-20">Loading Dune + Supabase data…</div>
      ) : (
        <div className="border border-[#464652]/15 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0e0e0f] border-b border-[#464652]/20 text-left">
                {['#','Address','Status','Name','Contact','Score','Txns','Volume','Contracts','Action'].map(h => (
                  <th key={h} className={`px-3 py-3 font-[family-name:var(--font-body)] text-[9px] text-[#908f9d] uppercase tracking-widest ${['Score','Txns','Volume','Contracts'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const meta = STATUS_META[r.status]
                return (
                  <tr key={r.address} className={`border-b border-[#464652]/10 last:border-0 hover:bg-[#201f20] transition-colors ${r.status === 'registered' ? 'bg-[#2e3192]/10' : idx % 2 === 0 ? 'bg-[#1c1b1c]' : 'bg-[#0e0e0f]'}`}>
                    <td className="px-3 py-2.5 font-[family-name:var(--font-headline)] font-bold text-[#c0c1ff]">
                      {r.rank <= 3 ? ['◈','◉','◇'][r.rank - 1] : `#${r.rank}`}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <a href={`https://basescan.org/address/${r.address}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">
                        {r.address.slice(0, 8)}…{r.address.slice(-4)}
                      </a>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`flex items-center gap-1.5 font-[family-name:var(--font-body)] ${meta.color}`}>
                        <span className={`w-1.5 h-1.5 shrink-0 ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-[family-name:var(--font-body)] font-bold text-[#e5e2e3] whitespace-nowrap">
                      {r.profile?.name ?? <span className="text-[#464652]">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5 font-[family-name:var(--font-body)]">
                        {r.profile?.email && <span className="text-[#908f9d]">{r.profile.email}</span>}
                        {r.profile?.x_username && <a href={`https://x.com/${r.profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">@{r.profile.x_username}</a>}
                        {r.profile?.telegram_handle && <span className="text-[#908f9d]">@{r.profile.telegram_handle}</span>}
                        {!r.profile && <span className="text-[#464652]">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-[family-name:var(--font-headline)] font-bold text-[#c0c1ff]">{fmt(r.activity_score)}</td>
                    <td className="px-3 py-2.5 text-right text-[#908f9d]">{fmt(r.native_tx_count + r.token_tx_count)}</td>
                    <td className="px-3 py-2.5 text-right text-[#908f9d]">{fmtUsd(r.total_token_volume_usd)}</td>
                    <td className="px-3 py-2.5 text-right text-[#908f9d]">{r.contracts_deployed}</td>
                    <td className="px-3 py-2.5">
                      {r.profile?.email ? (
                        <a href={`mailto:${r.profile.email}?subject=ETH Cali OG NFT&body=Hi ${r.profile.name}, you are ranked #${r.rank} and eligible for the ETH Cali OG NFT! Please confirm your wallet ${r.address} to receive it.`}
                          className="font-[family-name:var(--font-body)] text-[9px] uppercase tracking-widest px-2 py-1 border border-[#c0c1ff]/20 text-[#c0c1ff] hover:bg-[#2e3192]/20 transition-colors whitespace-nowrap">
                          ✉ Claim
                        </a>
                      ) : (
                        <span className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-widest">No email</span>
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
