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
    <div className="p-8 flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Unique Addresses</h1>
          <p className="text-gray-400 text-sm mt-1">
            All wallet addresses collected from POAP events and NFT contracts
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-500">Total</span>
            <span className="ml-2 font-bold text-emerald-400">{total.toLocaleString()}</span>
          </div>
          <button
            onClick={handleExport} disabled={exporting}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
          >
            {exporting ? 'Exporting…' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Search by address prefix (0x...)..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 font-mono"
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(0) }} className="text-xs text-gray-500 hover:text-gray-300">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-800 bg-gray-900">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Address</th>
              <th className="px-4 py-3 text-right">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-gray-600 py-12">No addresses found.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.address} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                <td className="px-4 py-2.5 text-gray-600 text-xs font-mono">{page * PAGE_SIZE + i + 1}</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  <a
                    href={`https://basescan.org/address/${r.address}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {r.address}
                  </a>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 text-xs whitespace-nowrap">
                  {new Date(r.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 text-xs">
            Page {page + 1} of {totalPages} · {total.toLocaleString()} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="bg-gray-900 border border-gray-800 hover:border-gray-600 disabled:opacity-30 text-white rounded-lg px-3 py-1.5 text-xs transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="bg-gray-900 border border-gray-800 hover:border-gray-600 disabled:opacity-30 text-white rounded-lg px-3 py-1.5 text-xs transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
