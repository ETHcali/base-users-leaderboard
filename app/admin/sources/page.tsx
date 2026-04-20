'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Chain metadata
const CHAINS: Record<string, { label: string; logo: string }> = {
  base:     { label: 'Base',      logo: '/chains/base logo.svg' },
  optimism: { label: 'Optimism',  logo: '/chains/op mainnet.png' },
  polygon:  { label: 'Polygon',   logo: '/chains/polygon.png' },
  ethereum: { label: 'Ethereum',  logo: '/chains/ethereum.png' },
  unichain: { label: 'Unichain',  logo: '/chains/unichain.png' },
  gnosis:   { label: 'Gnosis',    logo: '/chains/gnosis.png' },
}
const CHAIN_OPTIONS = Object.keys(CHAINS)

// POAPs live on Gnosis chain (POAP protocol)
const POAP_CHAIN = 'gnosis'

type PoapSource = { id: number; event_id: number; name: string; created_at: string; holder_count: number; last_synced_at: string | null }
type NftSource  = { id: number; address: string; chain: string; name: string; created_at: string; holder_count: number; last_synced_at: string | null }
type UnifiedRow =
  | (PoapSource & { kind: 'poap'; chain: string })
  | (NftSource  & { kind: 'nft' })

type SyncResult = {
  total: number
  bySource: { source: string; count: number; error?: string }[]
  durationMs: number
}

type FilterType  = 'all' | 'poap' | 'nft'
type FilterChain = 'all' | string

function ChainBadge({ chain }: { chain: string }) {
  const meta = CHAINS[chain]
  if (!meta) return <span className="text-gray-500 text-xs">{chain}</span>
  return (
    <span className="flex items-center gap-1.5">
      <img src={meta.logo} alt={meta.label} className="w-4 h-4 rounded-full object-cover" />
      <span className="text-gray-300 text-xs">{meta.label}</span>
    </span>
  )
}

function TypeBadge({ kind }: { kind: 'poap' | 'nft' }) {
  return kind === 'poap'
    ? <span className="bg-blue-900/60 text-blue-300 border border-blue-700/40 text-xs font-medium px-2 py-0.5 rounded-full">POAP</span>
    : <span className="bg-purple-900/60 text-purple-300 border border-purple-700/40 text-xs font-medium px-2 py-0.5 rounded-full">NFT</span>
}

export default function SourcesPage() {
  const [poaps, setPoaps] = useState<PoapSource[]>([])
  const [nfts, setNfts] = useState<NftSource[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [datasetCount, setDatasetCount] = useState<number | null>(null)

  // filters
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [chainFilter, setChainFilter] = useState<FilterChain>('all')

  // add panels
  const [panel, setPanel] = useState<'none' | 'poap' | 'nft'>('none')

  // POAP form
  const [newPoapId, setNewPoapId] = useState('')
  const [newPoapName, setNewPoapName] = useState('')
  const [addingPoap, setAddingPoap] = useState(false)
  const [poapError, setPoapError] = useState<string | null>(null)

  // NFT form
  const [newNftAddr, setNewNftAddr] = useState('')
  const [newNftChain, setNewNftChain] = useState('base')
  const [newNftName, setNewNftName] = useState('')
  const [addingNft, setAddingNft] = useState(false)
  const [nftError, setNftError] = useState<string | null>(null)

  // sync
  const [syncing, setSyncing] = useState(false)
  const [syncingRow, setSyncingRow] = useState<string | null>(null) // 'poap-{id}' or 'nft-{addr}'
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => { loadSources(); loadDatasetCount() }, [])

  async function loadSources() {
    setLoadingData(true)
    const [{ data: p }, { data: n }] = await Promise.all([
      supabase.from('poap_sources').select('*').order('created_at', { ascending: false }),
      supabase.from('nft_sources').select('*').order('created_at', { ascending: false }),
    ])
    setPoaps(p ?? [])
    setNfts(n ?? [])
    setLoadingData(false)
  }

  async function loadDatasetCount() {
    const { count } = await supabase.from('dataset_addresses').select('*', { count: 'exact', head: true })
    setDatasetCount(count ?? 0)
  }

  async function addPoap(e: React.FormEvent) {
    e.preventDefault(); setPoapError(null)
    const eventId = parseInt(newPoapId)
    if (!eventId || isNaN(eventId)) return setPoapError('Enter a valid numeric POAP event ID.')
    if (!newPoapName.trim()) return setPoapError('Name is required.')
    setAddingPoap(true)
    const { error } = await supabase.from('poap_sources').upsert(
      { event_id: eventId, name: newPoapName.trim() }, { onConflict: 'event_id' }
    )
    setAddingPoap(false)
    if (error) return setPoapError(error.message)
    setNewPoapId(''); setNewPoapName(''); setPanel('none')
    loadSources()
  }

  async function addNft(e: React.FormEvent) {
    e.preventDefault(); setNftError(null)
    if (!/^0x[a-fA-F0-9]{40}$/.test(newNftAddr)) return setNftError('Enter a valid EVM address (0x...).')
    if (!newNftName.trim()) return setNftError('Name is required.')
    setAddingNft(true)
    const { error } = await supabase.from('nft_sources').upsert(
      { address: newNftAddr.toLowerCase(), chain: newNftChain, name: newNftName.trim() }, { onConflict: 'address' }
    )
    setAddingNft(false)
    if (error) return setNftError(error.message)
    setNewNftAddr(''); setNewNftName(''); setNewNftChain('base'); setPanel('none')
    loadSources()
  }

  async function deletePoap(id: number) {
    await supabase.from('poap_sources').delete().eq('id', id)
    loadSources()
  }
  async function deleteNft(id: number) {
    await supabase.from('nft_sources').delete().eq('id', id)
    loadSources()
  }

  async function runSync() {
    setSyncing(true); setSyncResult(null); setSyncError(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: SyncResult = await res.json()
      setSyncResult(data); loadSources(); loadDatasetCount()
    } catch (err) { setSyncError(String(err)) }
    finally { setSyncing(false) }
  }

  async function syncOne(row: UnifiedRow) {
    const key = row.kind === 'poap' ? `poap-${row.event_id}` : `nft-${row.address}`
    setSyncingRow(key)
    try {
      const body = row.kind === 'poap'
        ? { type: 'poap', id: row.event_id }
        : { type: 'nft', id: row.address }
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      loadSources(); loadDatasetCount()
    } catch (err) {
      setSyncError(String(err))
    } finally {
      setSyncingRow(null)
    }
  }

  // Unified rows
  const unified: UnifiedRow[] = [
    ...poaps.map(p => ({ ...p, kind: 'poap' as const, chain: POAP_CHAIN })),
    ...nfts.map(n => ({ ...n, kind: 'nft' as const })),
  ]

  // Available chains in current data (for filter pills)
  const activeChains = [...new Set(unified.map(r => r.chain))]

  const filtered = unified.filter(r => {
    if (typeFilter  !== 'all' && r.kind  !== typeFilter)  return false
    if (chainFilter !== 'all' && r.chain !== chainFilter) return false
    return true
  })

  const poapsInFiltered = filtered.filter(r => r.kind === 'poap').length
  const nftsInFiltered  = filtered.filter(r => r.kind === 'nft').length

  return (
    <div className="p-8 flex flex-col gap-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sources</h1>
          <p className="text-gray-400 text-sm mt-1">POAPs and NFTs that build the wallet dataset</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
            <span className="text-gray-500">Dataset</span>
            <span className="font-bold text-emerald-400">{datasetCount ?? '…'} addresses</span>
          </div>
          <button onClick={() => setPanel(panel === 'poap' ? 'none' : 'poap')}
            className={`flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 transition-colors ${panel === 'poap' ? 'bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
            + Add POAP
          </button>
          <button onClick={() => setPanel(panel === 'nft' ? 'none' : 'nft')}
            className={`flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 transition-colors ${panel === 'nft' ? 'bg-purple-700 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}>
            + Add NFT
          </button>
          <button onClick={runSync} disabled={syncing || unified.length === 0}
            className="flex items-center gap-1.5 text-sm font-semibold rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors">
            {syncing ? <><span className="animate-spin inline-block">⟳</span> Syncing…</> : '🔄 Sync'}
          </button>
        </div>
      </div>

      {/* Add POAP panel */}
      {panel === 'poap' && (
        <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl p-5">
          <h3 className="font-semibold text-blue-200 mb-4 flex items-center gap-2">
            <img src={CHAINS.gnosis.logo} alt="Gnosis" className="w-5 h-5 rounded-full" />
            Add POAP Event <span className="text-blue-500 text-xs font-normal">— always on Gnosis chain</span>
          </h3>
          <form onSubmit={addPoap} className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-xs text-blue-400 mb-1 block">Event ID *</label>
              <input type="number" value={newPoapId} onChange={e => setNewPoapId(e.target.value)}
                placeholder="e.g. 147806" autoFocus
                className="w-36 bg-gray-900 border border-blue-700/50 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex-1 min-w-52">
              <label className="text-xs text-blue-400 mb-1 block">Event name *</label>
              <input value={newPoapName} onChange={e => setNewPoapName(e.target.value)} placeholder="ETH Cali Workshop 2025"
                className="w-full bg-gray-900 border border-blue-700/50 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addingPoap}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors">
                {addingPoap ? 'Adding…' : 'Add'}
              </button>
              <button type="button" onClick={() => setPanel('none')} className="text-gray-500 hover:text-gray-300 text-sm px-3 py-2">Cancel</button>
            </div>
          </form>
          {poapError && <p className="text-red-400 text-xs mt-2">{poapError}</p>}
        </div>
      )}

      {/* Add NFT panel */}
      {panel === 'nft' && (
        <div className="bg-purple-950/40 border border-purple-800/50 rounded-2xl p-5">
          <h3 className="font-semibold text-purple-200 mb-4">Add NFT Contract</h3>
          <form onSubmit={addNft} className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-64">
              <label className="text-xs text-purple-400 mb-1 block">Contract address *</label>
              <input value={newNftAddr} onChange={e => setNewNftAddr(e.target.value)} placeholder="0x..." autoFocus
                className="w-full bg-gray-900 border border-purple-700/50 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-xs text-purple-400 mb-1 block">Chain *</label>
              <select value={newNftChain} onChange={e => setNewNftChain(e.target.value)}
                className="bg-gray-900 border border-purple-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                {CHAIN_OPTIONS.map(c => (
                  <option key={c} value={c}>{CHAINS[c]?.label ?? c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="text-xs text-purple-400 mb-1 block">Name *</label>
              <input value={newNftName} onChange={e => setNewNftName(e.target.value)} placeholder="Event name"
                className="w-full bg-gray-900 border border-purple-700/50 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addingNft}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors">
                {addingNft ? 'Adding…' : 'Add'}
              </button>
              <button type="button" onClick={() => setPanel('none')} className="text-gray-500 hover:text-gray-300 text-sm px-3 py-2">Cancel</button>
            </div>
          </form>
          {nftError && <p className="text-red-400 text-xs mt-2">{nftError}</p>}
        </div>
      )}

      {/* Sync result */}
      {(syncError || syncResult) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          {syncError && <p className="text-red-400 text-sm">{syncError}</p>}
          {syncResult && (
            <>
              <div className="flex items-center gap-4">
                <span className="text-emerald-400 font-bold">{syncResult.total.toLocaleString()} unique addresses collected</span>
                <span className="text-gray-500 text-xs">in {(syncResult.durationMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="grid grid-cols-1 gap-0.5 max-h-48 overflow-y-auto text-xs">
                {syncResult.bySource.map((s, i) => (
                  <div key={i} className="flex justify-between gap-4 py-0.5">
                    <span className={s.error ? 'text-red-400' : 'text-gray-400'}>{s.source}</span>
                    <span className={s.error ? 'text-red-400' : 'text-white font-mono'}>
                      {s.error ? `⚠ ${s.error.slice(0, 60)}` : `${s.count} addresses`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats summary */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: `${poaps.length} POAPs`, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/40' },
          { label: `${nfts.length} NFTs`, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/40' },
          { label: `${unified.length} total sources`, color: 'text-white', bg: 'bg-gray-900 border-gray-800' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl px-4 py-2 text-sm font-semibold ${s.bg} ${s.color}`}>
            {s.label}
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-gray-500 text-xs mr-1">Type:</span>
        {(['all', 'poap', 'nft'] as FilterType[]).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${typeFilter === t ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}>
            {t === 'all' ? 'All types' : t.toUpperCase()}
          </button>
        ))}
        <span className="text-gray-700 mx-1">|</span>
        <span className="text-gray-500 text-xs mr-1">Chain:</span>
        <button onClick={() => setChainFilter('all')}
          className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${chainFilter === 'all' ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}>
          All chains
        </button>
        {activeChains.map(c => {
          const meta = CHAINS[c]
          return (
            <button key={c} onClick={() => setChainFilter(chainFilter === c ? 'all' : c)}
              className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border transition-colors ${chainFilter === c ? 'bg-gray-700 border-gray-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}>
              {meta && <img src={meta.logo} alt={meta.label} className="w-3.5 h-3.5 rounded-full object-cover" />}
              {meta?.label ?? c}
            </button>
          )
        })}
        <span className="text-gray-600 text-xs ml-auto">{filtered.length} shown · {poapsInFiltered} POAPs, {nftsInFiltered} NFTs</span>
      </div>

      {/* Unified table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-800 bg-gray-900 text-left">
              <th className="px-4 py-3">Chain</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">ID / Address</th>
              <th className="px-4 py-3 text-right">Holders</th>
              <th className="px-4 py-3 text-right">Last sync</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-600 py-16">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    <span>No sources match this filter.</span>
                    <button onClick={() => { setTypeFilter('all'); setChainFilter('all') }} className="text-blue-400 text-xs hover:underline">Clear filters</button>
                  </div>
                </td>
              </tr>
            ) : filtered.map(row => (
              <tr key={row.kind === 'poap' ? `poap-${row.event_id}` : `nft-${row.address}`}
                className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3">
                  <ChainBadge chain={row.chain} />
                </td>
                <td className="px-4 py-3">
                  <TypeBadge kind={row.kind} />
                </td>
                <td className="px-4 py-3 text-white font-medium max-w-xs truncate" title={row.name}>
                  {row.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {row.kind === 'poap' ? (
                    <a href={`https://poap.gallery/drops/${row.event_id}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300">
                      #{row.event_id}
                    </a>
                  ) : (
                    <a href={`https://${row.chain === 'base' ? 'base' : row.chain === 'optimism' ? 'optimism' : row.chain === 'polygon' ? 'polygon' : 'eth'}.blockscout.com/address/${row.address}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300">
                      {row.address.slice(0, 8)}…{row.address.slice(-6)}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.holder_count > 0
                    ? <span className="text-white font-semibold text-sm">{row.holder_count.toLocaleString()}</span>
                    : <span className="text-gray-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                  {row.last_synced_at
                    ? new Date(row.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : <span className="text-gray-700">never</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(() => {
                      const key = row.kind === 'poap' ? `poap-${row.event_id}` : `nft-${row.address}`
                      const isSyncing = syncingRow === key
                      return (
                        <button
                          onClick={() => syncOne(row)}
                          disabled={isSyncing || syncing}
                          className="text-emerald-600 hover:text-emerald-400 disabled:opacity-40 text-xs px-2 py-1 rounded-lg hover:bg-emerald-900/20 transition-colors"
                          title="Sync this source"
                        >
                          {isSyncing ? <span className="animate-spin inline-block">⟳</span> : '⟳'}
                        </button>
                      )
                    })()}
                    <button
                      onClick={() => row.kind === 'poap' ? deletePoap(row.id) : deleteNft(row.id)}
                      className="text-gray-600 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-900/20 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
