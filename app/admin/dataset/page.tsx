'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 50

type AddressRow = { address: string; updated_at: string }

function exportCsv(rows: AddressRow[]) {
  const csv = 'address\n' + rows.map(r => r.address).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'ethcali-dataset.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function DatasetPage() {
  const [rows, setRows] = useState<AddressRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [allRows, setAllRows] = useState<AddressRow[]>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadPage() }, [page, search])

  async function loadPage() {
    setLoading(true)
    let q = supabase
      .from('dataset_addresses')
      .select('address, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search.trim()) q = q.ilike('address', `${search.trim()}%`)

    const { data, count } = await q
    setRows(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }

  async function handleExport() {
    setExporting(true)
    const { data } = await supabase
      .from('dataset_addresses')
      .select('address, updated_at')
      .order('updated_at', { ascending: false })
    exportCsv(data ?? [])
    setExporting(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-8 flex flex-col gap-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em] mb-2">// address_registry</p>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl font-extrabold text-[#e5e2e3] uppercase tracking-tight">Dataset</h1>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#464652] uppercase tracking-wider mt-2">
            Unique wallet addresses · <span className="text-[#c0c1ff]">{total.toLocaleString()} total</span>
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="cyber-gradient disabled:opacity-40 text-[#0e0e0f] font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-[0.2em] px-6 py-3 hover:shadow-[0_0_20px_rgba(46,49,146,0.5)] transition-all">
          {exporting ? 'Exporting…' : '⬇ Export CSV'}
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <input
          type="text" placeholder="Search by address prefix (0x...)…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="flex-1 bg-transparent border-b border-[#464652]/40 focus:border-[#c0c1ff]/60 text-[#e5e2e3] font-mono text-xs py-2 px-0 placeholder-[#464652] focus:outline-none transition-colors"
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(0) }} className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] hover:text-[#908f9d] uppercase tracking-widest transition-colors">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="border border-[#464652]/15 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0e0e0f] border-b border-[#464652]/20 text-left">
              <th className="px-4 py-3 font-[family-name:var(--font-body)] text-[9px] text-[#908f9d] uppercase tracking-widest">#</th>
              <th className="px-4 py-3 font-[family-name:var(--font-body)] text-[9px] text-[#908f9d] uppercase tracking-widest">Address</th>
              <th className="px-4 py-3 font-[family-name:var(--font-body)] text-[9px] text-[#908f9d] uppercase tracking-widest text-right">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-[#464652]/10">
                  <td colSpan={3} className="px-4 py-3"><div className="h-4 bg-[#201f20] animate-pulse w-full" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="text-center font-[family-name:var(--font-body)] text-[#464652] text-xs uppercase tracking-widest py-12">No addresses found.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.address} className={`border-b border-[#464652]/10 last:border-0 hover:bg-[#201f20] transition-colors ${i % 2 === 0 ? 'bg-[#1c1b1c]' : 'bg-[#0e0e0f]'}`}>
                <td className="px-4 py-2.5 font-mono text-[10px] text-[#464652]">{page * PAGE_SIZE + i + 1}</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  <a href={`https://basescan.org/address/${r.address}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">
                    {r.address}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-right font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] whitespace-nowrap">
                  {new Date(r.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-widest">
            Page {page + 1} / {totalPages} · {total.toLocaleString()} total
          </span>
          <div className="flex gap-2">
            {[
              { label: '← Prev', disabled: page === 0, action: () => setPage(p => Math.max(0, p - 1)) },
              { label: 'Next →', disabled: page >= totalPages - 1, action: () => setPage(p => Math.min(totalPages - 1, p + 1)) },
            ].map(b => (
              <button key={b.label} onClick={b.action} disabled={b.disabled}
                className="border border-[#464652]/30 disabled:opacity-30 text-[#908f9d] hover:text-[#c0c1ff] hover:border-[#c0c1ff]/30 font-[family-name:var(--font-body)] text-xs uppercase tracking-widest px-4 py-2 transition-colors">
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
