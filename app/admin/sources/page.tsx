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

type PoapSource = { id: number; event_id: number; name: string; chain: string; created_at: string; holder_count: number; last_synced_at: string | null; event_date: string | null }
type NftSource  = { id: number; address: string; chain: string; name: string; created_at: string; holder_count: number; last_synced_at: string | null; event_date: string | null }
type UnifiedRow =
  | (PoapSource & { kind: 'poap' })
  | (NftSource  & { kind: 'nft' })

type EditState = { name: string; chain: string; event_date: string }

type SyncResult = {
  total: number
  bySource: { source: string; count: number; error?: string }[]
  durationMs: number
}

type FilterType  = 'all' | 'poap' | 'nft'
type FilterChain = 'all' | string

function ChainBadge({ chain }: { chain: string }) {
  const meta = CHAINS[chain]
  if (!meta) return <span className="text-[#908f9d] text-xs font-[family-name:var(--font-body)]">{chain}</span>
  return (
    <span className="flex items-center gap-1.5">
      <img src={meta.logo} alt={meta.label} className="w-4 h-4 object-contain" />
      <span className="text-[#e5e2e3] text-xs font-[family-name:var(--font-body)]">{meta.label}</span>
    </span>
  )
}

function TypeBadge({ kind }: { kind: 'poap' | 'nft' }) {
  return kind === 'poap'
    ? <span className="border border-[#c0c1ff]/20 text-[#c0c1ff] text-[9px] font-[family-name:var(--font-body)] font-bold px-2 py-0.5 uppercase tracking-widest">POAP</span>
    : <span className="border border-[#908f9d]/30 text-[#908f9d] text-[9px] font-[family-name:var(--font-body)] font-bold px-2 py-0.5 uppercase tracking-widest">NFT</span>
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
  const [newPoapChain, setNewPoapChain] = useState('gnosis')
  const [newPoapDate, setNewPoapDate] = useState('')
  const [addingPoap, setAddingPoap] = useState(false)
  const [poapError, setPoapError] = useState<string | null>(null)

  // NFT form
  const [newNftAddr, setNewNftAddr] = useState('')
  const [newNftChain, setNewNftChain] = useState('base')
  const [newNftName, setNewNftName] = useState('')
  const [newNftDate, setNewNftDate] = useState('')
  const [addingNft, setAddingNft] = useState(false)
  const [nftError, setNftError] = useState<string | null>(null)

  // sync
  const [syncing, setSyncing] = useState(false)
  const [syncingRow, setSyncingRow] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  // inline edit
  const [editingRow, setEditingRow] = useState<string | null>(null) // 'poap-{id}' or 'nft-{addr}'
  const [editState, setEditState] = useState<EditState>({ name: '', chain: '', event_date: '' })
  const [saving, setSaving] = useState(false)

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
      { event_id: eventId, name: newPoapName.trim(), chain: newPoapChain, event_date: newPoapDate || null }, { onConflict: 'event_id' }
    )
    setAddingPoap(false)
    if (error) return setPoapError(error.message)
    setNewPoapId(''); setNewPoapName(''); setNewPoapChain('gnosis'); setNewPoapDate(''); setPanel('none')
    loadSources()
  }

  async function addNft(e: React.FormEvent) {
    e.preventDefault(); setNftError(null)
    if (!/^0x[a-fA-F0-9]{40}$/.test(newNftAddr)) return setNftError('Enter a valid EVM address (0x...).')
    if (!newNftName.trim()) return setNftError('Name is required.')
    setAddingNft(true)
    const { error } = await supabase.from('nft_sources').upsert(
      { address: newNftAddr.toLowerCase(), chain: newNftChain, name: newNftName.trim(), event_date: newNftDate || null }, { onConflict: 'address' }
    )
    setAddingNft(false)
    if (error) return setNftError(error.message)
    setNewNftAddr(''); setNewNftName(''); setNewNftChain('base'); setNewNftDate(''); setPanel('none')
    loadSources()
  }

  function startEdit(row: UnifiedRow) {
    const key = row.kind === 'poap' ? `poap-${row.event_id}` : `nft-${row.address}`
    setEditingRow(key)
    setEditState({ name: row.name, chain: row.chain, event_date: row.event_date ?? '' })
  }

  async function saveEdit(row: UnifiedRow) {
    if (!editState.name.trim()) return
    setSaving(true)
    const patch = { name: editState.name.trim(), chain: editState.chain, event_date: editState.event_date || null }
    if (row.kind === 'poap') {
      await supabase.from('poap_sources').update(patch).eq('id', row.id)
    } else {
      await supabase.from('nft_sources').update(patch).eq('id', row.id)
    }
    setSaving(false)
    setEditingRow(null)
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
    setSyncingRow(key); setSyncResult(null); setSyncError(null)
    try {
      const body = row.kind === 'poap'
        ? { type: 'poap', id: row.event_id }
        : { type: 'nft', id: row.address }
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: SyncResult = await res.json()
      setSyncResult(data)
      loadSources(); loadDatasetCount()
    } catch (err) {
      setSyncError(String(err))
    } finally {
      setSyncingRow(null)
    }
  }

  // Unified rows — POAPs use their own chain column now
  const unified: UnifiedRow[] = [
    ...poaps.map(p => ({ ...p, kind: 'poap' as const })),
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

  const inputCls = 'bg-transparent border-b border-[#464652]/40 focus:border-[#c0c1ff]/60 text-[#e5e2e3] font-[family-name:var(--font-body)] text-sm py-2 px-0 placeholder-[#464652] focus:outline-none transition-colors w-full'
  const selectCls = 'bg-[#1c1b1c] border border-[#464652]/40 text-[#e5e2e3] font-[family-name:var(--font-body)] text-xs py-2 px-2 focus:outline-none focus:border-[#c0c1ff]/60'

  return (
    <div className="p-8 flex flex-col gap-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em] mb-2">// event_sources</p>
          <h1 className="font-[family-name:var(--font-headline)] text-4xl font-extrabold text-[#e5e2e3] uppercase tracking-tight">
            Sources
          </h1>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#464652] uppercase tracking-wider mt-2">
            POAPs and NFTs that build the wallet dataset
            {datasetCount !== null && <span className="ml-3 text-[#c0c1ff]">· {datasetCount.toLocaleString()} addresses</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setPanel(panel === 'poap' ? 'none' : 'poap')}
            className={`font-[family-name:var(--font-body)] text-xs uppercase tracking-widest px-4 py-2.5 border transition-colors ${panel === 'poap' ? 'border-[#c0c1ff]/40 bg-[#2e3192]/20 text-[#c0c1ff]' : 'border-[#464652]/40 text-[#908f9d] hover:text-[#c0c1ff] hover:border-[#c0c1ff]/20'}`}>
            + Add POAP
          </button>
          <button onClick={() => setPanel(panel === 'nft' ? 'none' : 'nft')}
            className={`font-[family-name:var(--font-body)] text-xs uppercase tracking-widest px-4 py-2.5 border transition-colors ${panel === 'nft' ? 'border-[#c0c1ff]/40 bg-[#2e3192]/20 text-[#c0c1ff]' : 'border-[#464652]/40 text-[#908f9d] hover:text-[#c0c1ff] hover:border-[#c0c1ff]/20'}`}>
            + Add NFT
          </button>
          <button onClick={runSync} disabled={syncing || unified.length === 0}
            className="cyber-gradient disabled:opacity-40 text-[#0e0e0f] font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-widest px-5 py-2.5 hover:shadow-[0_0_20px_rgba(46,49,146,0.5)] transition-all flex items-center gap-2">
            <span className={syncing ? 'animate-spin inline-block' : ''}>⟳</span>
            {syncing ? 'Syncing…' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Add POAP panel */}
      {panel === 'poap' && (
        <div className="bg-[#1c1b1c] border border-[#c0c1ff]/20 p-6" style={{ boxShadow: '0 0 20px rgba(46,49,146,0.1)' }}>
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#c0c1ff] uppercase tracking-widest mb-5">Add POAP Event</p>
          <form onSubmit={addPoap} className="flex gap-6 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Event ID *</label>
              <input type="number" value={newPoapId} onChange={e => setNewPoapId(e.target.value)} placeholder="e.g. 147806" autoFocus className={`${inputCls} w-32`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Chain</label>
              <select value={newPoapChain} onChange={e => setNewPoapChain(e.target.value)} className={selectCls}>
                {CHAIN_OPTIONS.map(c => <option key={c} value={c}>{CHAINS[c]?.label ?? c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-52">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Event name *</label>
              <input value={newPoapName} onChange={e => setNewPoapName(e.target.value)} placeholder="ETH Cali Workshop 2025" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Event date</label>
              <input type="date" value={newPoapDate} onChange={e => setNewPoapDate(e.target.value)} className={`${inputCls} w-36`} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addingPoap} className="cyber-gradient disabled:opacity-40 text-[#0e0e0f] font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-widest px-5 py-2.5 transition-all">
                {addingPoap ? '…' : 'Add'}
              </button>
              <button type="button" onClick={() => setPanel('none')} className="font-[family-name:var(--font-body)] text-xs text-[#464652] hover:text-[#908f9d] px-3 py-2 uppercase tracking-widest transition-colors">Cancel</button>
            </div>
          </form>
          {poapError && <p className="font-[family-name:var(--font-body)] text-[11px] text-[#ffb4ab] mt-3 uppercase tracking-wider">✕ {poapError}</p>}
        </div>
      )}

      {/* Add NFT panel */}
      {panel === 'nft' && (
        <div className="bg-[#1c1b1c] border border-[#908f9d]/20 p-6">
          <p className="font-[family-name:var(--font-body)] text-[10px] text-[#908f9d] uppercase tracking-widest mb-5">Add NFT Contract</p>
          <form onSubmit={addNft} className="flex gap-6 flex-wrap items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-64">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Contract address *</label>
              <input value={newNftAddr} onChange={e => setNewNftAddr(e.target.value)} placeholder="0x..." autoFocus className={`${inputCls} font-mono`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Chain *</label>
              <select value={newNftChain} onChange={e => setNewNftChain(e.target.value)} className={selectCls}>
                {CHAIN_OPTIONS.map(c => <option key={c} value={c}>{CHAINS[c]?.label ?? c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-40">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Name *</label>
              <input value={newNftName} onChange={e => setNewNftName(e.target.value)} placeholder="Event name" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-[family-name:var(--font-body)] text-[#908f9d] uppercase tracking-widest">Event date</label>
              <input type="date" value={newNftDate} onChange={e => setNewNftDate(e.target.value)} className={`${inputCls} w-36`} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addingNft} className="cyber-gradient disabled:opacity-40 text-[#0e0e0f] font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-widest px-5 py-2.5 transition-all">
                {addingNft ? '…' : 'Add'}
              </button>
              <button type="button" onClick={() => setPanel('none')} className="font-[family-name:var(--font-body)] text-xs text-[#464652] hover:text-[#908f9d] px-3 py-2 uppercase tracking-widest transition-colors">Cancel</button>
            </div>
          </form>
          {nftError && <p className="font-[family-name:var(--font-body)] text-[11px] text-[#ffb4ab] mt-3 uppercase tracking-wider">✕ {nftError}</p>}
        </div>
      )}

      {/* Sync result */}
      {(syncError || syncResult) && (
        <div className={`border p-4 font-[family-name:var(--font-body)] text-xs flex flex-col gap-3 ${syncError ? 'border-[#ffb4ab]/20 bg-[#93000a]/10 text-[#ffb4ab]' : 'border-[#c0c1ff]/20 bg-[#2e3192]/10 text-[#c0c1ff]'}`}>
          {syncError && <p>{syncError}</p>}
          {syncResult && (
            <>
              <p className="font-bold uppercase tracking-wider">✓ {syncResult.total.toLocaleString()} unique addresses · {(syncResult.durationMs / 1000).toFixed(1)}s</p>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {syncResult.bySource.map((s, i) => (
                  <div key={i} className="flex justify-between gap-4 text-[10px]">
                    <span className={s.error ? 'text-[#ffb4ab]' : 'text-[#908f9d]'}>{s.source}</span>
                    <span className={s.error ? 'text-[#ffb4ab]' : 'text-[#e5e2e3] font-mono'}>
                      {s.error ? `✕ ${s.error.slice(0, 60)}` : `${s.count} addrs`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats + filters */}
      <div className="flex gap-4 flex-wrap items-center">
        {[
          { label: `${poaps.length} POAPs`, active: typeFilter === 'poap', onClick: () => setTypeFilter(typeFilter === 'poap' ? 'all' : 'poap') },
          { label: `${nfts.length} NFTs`, active: typeFilter === 'nft', onClick: () => setTypeFilter(typeFilter === 'nft' ? 'all' : 'nft') },
          { label: `${unified.length} total`, active: typeFilter === 'all', onClick: () => setTypeFilter('all') },
        ].map(s => (
          <button key={s.label} onClick={s.onClick}
            className={`font-[family-name:var(--font-body)] text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${s.active ? 'border-[#c0c1ff]/40 text-[#c0c1ff] bg-[#2e3192]/10' : 'border-[#464652]/30 text-[#908f9d] hover:text-[#c0c1ff]'}`}>
            {s.label}
          </button>
        ))}
        <div className="h-4 w-px bg-[#464652]/30" />
        <button onClick={() => setChainFilter('all')}
          className={`font-[family-name:var(--font-body)] text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${chainFilter === 'all' ? 'border-[#c0c1ff]/40 text-[#c0c1ff] bg-[#2e3192]/10' : 'border-[#464652]/30 text-[#908f9d] hover:text-[#c0c1ff]'}`}>
          All chains
        </button>
        {activeChains.map(c => {
          const meta = CHAINS[c]
          return (
            <button key={c} onClick={() => setChainFilter(chainFilter === c ? 'all' : c)}
              className={`flex items-center gap-1.5 font-[family-name:var(--font-body)] text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${chainFilter === c ? 'border-[#c0c1ff]/40 text-[#c0c1ff] bg-[#2e3192]/10' : 'border-[#464652]/30 text-[#908f9d] hover:text-[#c0c1ff]'}`}>
              {meta && <img src={meta.logo} alt={meta.label} className="w-3.5 h-3.5 object-contain" />}
              {meta?.label ?? c}
            </button>
          )
        })}
        <span className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] uppercase tracking-widest ml-auto">
          {filtered.length} shown · {poapsInFiltered} POAPs · {nftsInFiltered} NFTs
        </span>
      </div>

      {/* Unified table */}
      <div className="border border-[#464652]/15 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0e0e0f] border-b border-[#464652]/20 text-left">
              {['Chain', 'Type', 'Name', 'Event date', 'ID / Address', 'Holders', 'Last sync', ''].map(h => (
                <th key={h} className={`px-4 py-3 font-[family-name:var(--font-body)] text-[9px] text-[#908f9d] uppercase tracking-widest ${h === 'Holders' || h === 'Last sync' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#464652]/10">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-4 bg-[#201f20] animate-pulse w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 font-[family-name:var(--font-body)] text-[#464652] text-xs uppercase tracking-widest">
                  No sources match this filter.{' '}
                  <button onClick={() => { setTypeFilter('all'); setChainFilter('all') }} className="text-[#c0c1ff] hover:underline">Clear</button>
                </td>
              </tr>
            ) : filtered.map(row => {
              const key = row.kind === 'poap' ? `poap-${row.event_id}` : `nft-${row.address}`
              const isEditing = editingRow === key
              const isSyncing = syncingRow === key

              if (isEditing) {
                return (
                  <tr key={key} className="border-b border-[#464652]/10 bg-[#201f20]">
                    <td className="px-3 py-2">
                      <select value={editState.chain} onChange={e => setEditState(s => ({ ...s, chain: e.target.value }))} className={`${selectCls} w-28`}>
                        {CHAIN_OPTIONS.map(c => <option key={c} value={c}>{CHAINS[c]?.label ?? c}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2"><TypeBadge kind={row.kind} /></td>
                    <td className="px-3 py-2">
                      <input
                        value={editState.name}
                        onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(row); if (e.key === 'Escape') setEditingRow(null) }}
                        autoFocus
                        className="w-full bg-transparent border-b border-[#c0c1ff]/40 text-[#e5e2e3] font-[family-name:var(--font-body)] text-xs py-1 px-0 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={editState.event_date}
                        onChange={e => setEditState(s => ({ ...s, event_date: e.target.value }))}
                        className="bg-transparent border-b border-[#c0c1ff]/40 text-[#e5e2e3] font-[family-name:var(--font-body)] text-xs py-1 px-0 focus:outline-none w-32"
                      />
                    </td>
                    <td className="px-3 py-2 text-[#464652] font-mono text-[10px]">—</td>
                    <td className="px-3 py-2 text-right text-[#464652]">{row.holder_count > 0 ? row.holder_count.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => saveEdit(row)} disabled={saving || !editState.name.trim()}
                          className="cyber-gradient disabled:opacity-40 text-[#0e0e0f] font-bold text-[9px] uppercase tracking-widest px-3 py-1.5">
                          {saving ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingRow(null)} className="font-[family-name:var(--font-body)] text-[9px] text-[#464652] hover:text-[#908f9d] px-2 py-1.5 uppercase tracking-widest transition-colors">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={key} className={`border-b border-[#464652]/10 last:border-0 hover:bg-[#201f20] transition-colors group ${row.kind === 'poap' ? 'bg-[#1c1b1c]' : 'bg-[#0e0e0f]'}`}>
                  <td className="px-4 py-3"><ChainBadge chain={row.chain} /></td>
                  <td className="px-4 py-3"><TypeBadge kind={row.kind} /></td>
                  <td className="px-4 py-3 text-[#e5e2e3] font-[family-name:var(--font-body)] max-w-xs truncate" title={row.name}>{row.name}</td>
                  <td className="px-4 py-3 text-[#908f9d] text-xs whitespace-nowrap font-[family-name:var(--font-body)]">
                    {row.event_date
                      ? new Date(row.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : <span className="text-[#464652]">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {row.kind === 'poap' ? (
                      <a href={`https://poap.gallery/drops/${row.event_id}`} target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">
                        #{row.event_id}
                      </a>
                    ) : (
                      <a href={`https://${row.chain === 'ethereum' ? 'eth' : row.chain}.blockscout.com/address/${row.address}`} target="_blank" rel="noopener noreferrer" className="text-[#e5e2e3] hover:text-[#c0c1ff] transition-colors font-mono">
                        {row.address.slice(0, 8)}…{row.address.slice(-6)}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.holder_count > 0
                      ? <span className="font-[family-name:var(--font-headline)] text-sm font-bold text-[#e5e2e3]">{row.holder_count.toLocaleString()}</span>
                      : <span className="text-[#464652]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-[#908f9d] whitespace-nowrap">
                    {row.last_synced_at
                      ? new Date(row.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : <span className="text-[#464652]">never</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(row)} className="text-[#908f9d] hover:text-[#c0c1ff] text-xs px-2 py-1 transition-colors" title="Edit">✏</button>
                      <button onClick={() => syncOne(row)} disabled={isSyncing || syncing} className="text-[#908f9d] hover:text-[#c0c1ff] disabled:opacity-40 text-xs px-2 py-1 transition-colors" title="Sync">
                        <span className={isSyncing ? 'animate-spin inline-block' : ''}>⟳</span>
                      </button>
                      <button onClick={() => row.kind === 'poap' ? deletePoap(row.id) : deleteNft(row.id)} className="text-[#464652] hover:text-[#ffb4ab] text-xs px-2 py-1 transition-colors" title="Remove">✕</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
