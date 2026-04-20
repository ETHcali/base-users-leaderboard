'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ''
const POAP_API_KEY = process.env.NEXT_PUBLIC_POAP_API_KEY ?? ''

const CHAIN_OPTIONS = ['base', 'optimism', 'polygon', 'ethereum', 'unichain']

type PoapSource = {
  id: number
  event_id: number
  name: string
  created_at: string
}

type NftSource = {
  id: number
  address: string
  chain: string
  name: string
  created_at: string
}

type SyncResult = {
  total: number
  bySource: { source: string; count: number; error?: string }[]
  durationMs: number
}

export default function SourcesPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)

  const [poaps, setPoaps] = useState<PoapSource[]>([])
  const [nfts, setNfts] = useState<NftSource[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Add POAP form
  const [newPoapId, setNewPoapId] = useState('')
  const [newPoapName, setNewPoapName] = useState('')
  const [addingPoap, setAddingPoap] = useState(false)
  const [poapError, setPoapError] = useState<string | null>(null)

  // Add NFT form
  const [newNftAddr, setNewNftAddr] = useState('')
  const [newNftChain, setNewNftChain] = useState('base')
  const [newNftName, setNewNftName] = useState('')
  const [addingNft, setAddingNft] = useState(false)
  const [nftError, setNftError] = useState<string | null>(null)

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [datasetCount, setDatasetCount] = useState<number | null>(null)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) { setAuthed(true); setPwError(false) }
    else setPwError(true)
  }

  useEffect(() => {
    if (!authed) return
    loadSources()
    loadDatasetCount()
  }, [authed])

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
    const { count } = await supabase
      .from('dataset_addresses')
      .select('*', { count: 'exact', head: true })
    setDatasetCount(count ?? 0)
  }

  async function addPoap(e: React.FormEvent) {
    e.preventDefault()
    setPoapError(null)
    const eventId = parseInt(newPoapId)
    if (!eventId || isNaN(eventId)) return setPoapError('Enter a valid numeric POAP event ID.')
    if (!newPoapName.trim()) return setPoapError('Name is required.')
    setAddingPoap(true)
    const { error } = await supabase.from('poap_sources').upsert(
      { event_id: eventId, name: newPoapName.trim() },
      { onConflict: 'event_id' }
    )
    setAddingPoap(false)
    if (error) return setPoapError(error.message)
    setNewPoapId(''); setNewPoapName('')
    loadSources()
  }

  async function addNft(e: React.FormEvent) {
    e.preventDefault()
    setNftError(null)
    if (!/^0x[a-fA-F0-9]{40}$/.test(newNftAddr)) return setNftError('Enter a valid EVM address (0x...).')
    if (!newNftName.trim()) return setNftError('Name is required.')
    setAddingNft(true)
    const { error } = await supabase.from('nft_sources').upsert(
      { address: newNftAddr.toLowerCase(), chain: newNftChain, name: newNftName.trim() },
      { onConflict: 'address' }
    )
    setAddingNft(false)
    if (error) return setNftError(error.message)
    setNewNftAddr(''); setNewNftName(''); setNewNftChain('base')
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
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    const t0 = Date.now()
    const bySource: SyncResult['bySource'] = []
    const allAddresses = new Set<string>()

    const BLOCKSCOUT: Record<string, string> = {
      base:     'https://base.blockscout.com',
      optimism: 'https://optimism.blockscout.com',
      polygon:  'https://polygon.blockscout.com',
      ethereum: 'https://eth.blockscout.com',
      unichain: 'https://unichain.blockscout.com',
    }

    // Fetch POAP holders
    for (const poap of poaps) {
      try {
        const addrs = new Set<string>()
        let offset = 0, total = null
        while (true) {
          const res = await fetch(
            `https://api.poap.tech/event/${poap.event_id}/poaps?limit=300&offset=${offset}`,
            { headers: { 'x-api-key': POAP_API_KEY } }
          )
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          if (!data?.tokens?.length) break
          total ??= data.total
          for (const t of data.tokens) {
            const a = t.owner?.id?.toLowerCase()
            if (a?.startsWith('0x')) { addrs.add(a); allAddresses.add(a) }
          }
          offset += 300
          if (offset >= (total ?? 0)) break
        }
        bySource.push({ source: `POAP #${poap.event_id} — ${poap.name}`, count: addrs.size })
      } catch (err) {
        bySource.push({ source: `POAP #${poap.event_id} — ${poap.name}`, count: 0, error: String(err) })
      }
    }

    // Fetch NFT holders via Blockscout
    for (const nft of nfts) {
      try {
        const addrs = new Set<string>()
        const base = BLOCKSCOUT[nft.chain] ?? BLOCKSCOUT.base
        let nextPageParams: Record<string, string> | null = null
        while (true) {
          let url = `${base}/api/v2/tokens/${nft.address}/holders`
          if (nextPageParams) url += '?' + new URLSearchParams(nextPageParams).toString()
          const res = await fetch(url)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          const items: { address?: { hash?: string } | string }[] = data?.items ?? []
          if (!items.length) break
          for (const item of items) {
            const raw = typeof item.address === 'string' ? item.address : item.address?.hash
            const a = raw?.toLowerCase()
            if (a?.startsWith('0x')) { addrs.add(a); allAddresses.add(a) }
          }
          nextPageParams = data?.next_page_params ?? null
          if (!nextPageParams) break
        }
        bySource.push({ source: `NFT ${nft.chain}:${nft.name}`, count: addrs.size })
      } catch (err) {
        bySource.push({ source: `NFT ${nft.chain}:${nft.name}`, count: 0, error: String(err) })
      }
    }

    // Upsert into dataset_addresses
    const rows = [...allAddresses].map(a => ({ address: a }))
    if (rows.length > 0) {
      // Batch upsert in chunks of 500
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from('dataset_addresses').upsert(rows.slice(i, i + 500), { onConflict: 'address' })
      }
    }

    setSyncResult({ total: allAddresses.size, bySource, durationMs: Date.now() - t0 })
    setSyncing(false)
    loadDatasetCount()
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4">
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <p className="text-gray-500 text-sm">ETH Cali — Sources Manager</p>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
          />
          {pwError && <p className="text-red-400 text-xs">Incorrect password.</p>}
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-2.5 text-sm">Enter</button>
        </form>
      </div>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">ETH Cali — Dataset Sources</h1>
          <p className="text-gray-400 text-sm mt-1">Manage POAP events and NFT contracts that feed the wallet dataset</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/admin" className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors">
            ← Users
          </Link>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-500">Dataset addresses</span>
            <span className="ml-2 font-bold text-emerald-400">{datasetCount ?? '…'}</span>
          </div>
        </div>
      </div>

      {/* Sync button */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold text-white">Sync dataset</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Fetches all holders from {poaps.length} POAP event{poaps.length !== 1 ? 's' : ''} and {nfts.length} NFT contract{nfts.length !== 1 ? 's' : ''}, deduplicates, and saves to Supabase.
            </p>
          </div>
          <button
            onClick={runSync}
            disabled={syncing || (poaps.length === 0 && nfts.length === 0)}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2"
          >
            {syncing ? (
              <><span className="animate-spin">⟳</span> Syncing…</>
            ) : (
              <><span>🔄</span> Run sync</>
            )}
          </button>
        </div>

        {syncError && <p className="text-red-400 text-sm">{syncError}</p>}

        {syncResult && (
          <div className="border-t border-gray-800 pt-4 flex flex-col gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-emerald-400 font-bold text-lg">{syncResult.total.toLocaleString()} unique addresses</span>
              <span className="text-gray-500 text-xs">in {(syncResult.durationMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1 max-h-48 overflow-y-auto">
              {syncResult.bySource.map((s, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className={s.error ? 'text-red-400' : 'text-gray-400'}>{s.source}</span>
                  <span className={s.error ? 'text-red-400' : 'text-white font-mono'}>
                    {s.error ? `⚠ ${s.error}` : `${s.count}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* POAP Sources */}
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <span>📍</span> POAP Events
            <span className="text-gray-500 text-xs font-normal">({poaps.length})</span>
          </h2>

          {/* Add POAP form */}
          <form onSubmit={addPoap} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Event ID *</label>
                <input
                  type="number" value={newPoapId} onChange={e => setNewPoapId(e.target.value)}
                  placeholder="e.g. 147806"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name *</label>
                <input
                  value={newPoapName} onChange={e => setNewPoapName(e.target.value)}
                  placeholder="Event name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            {poapError && <p className="text-red-400 text-xs">{poapError}</p>}
            <button type="submit" disabled={addingPoap} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2 transition-colors">
              {addingPoap ? 'Adding…' : '+ Add POAP event'}
            </button>
          </form>

          {/* POAP list */}
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {loadingData ? (
              <div className="text-gray-600 text-sm text-center py-4">Loading…</div>
            ) : poaps.length === 0 ? (
              <div className="text-gray-600 text-sm text-center py-4">No POAP events yet.</div>
            ) : poaps.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-blue-400">#{p.event_id}</div>
                  <div className="text-xs text-gray-300 mt-0.5">{p.name}</div>
                </div>
                <button
                  onClick={() => deletePoap(p.id)}
                  className="text-gray-600 hover:text-red-400 text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* NFT Sources */}
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <span>🪙</span> NFT Contracts
            <span className="text-gray-500 text-xs font-normal">({nfts.length})</span>
          </h2>

          {/* Add NFT form */}
          <form onSubmit={addNft} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Contract address *</label>
              <input
                value={newNftAddr} onChange={e => setNewNftAddr(e.target.value)}
                placeholder="0x..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Chain *</label>
                <select
                  value={newNftChain} onChange={e => setNewNftChain(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {CHAIN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name *</label>
                <input
                  value={newNftName} onChange={e => setNewNftName(e.target.value)}
                  placeholder="Contract name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
            {nftError && <p className="text-red-400 text-xs">{nftError}</p>}
            <button type="submit" disabled={addingNft} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2 transition-colors">
              {addingNft ? 'Adding…' : '+ Add NFT contract'}
            </button>
          </form>

          {/* NFT list */}
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {loadingData ? (
              <div className="text-gray-600 text-sm text-center py-4">Loading…</div>
            ) : nfts.length === 0 ? (
              <div className="text-gray-600 text-sm text-center py-4">No NFT contracts yet.</div>
            ) : nfts.map(n => (
              <div key={n.id} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-purple-400">
                    {n.address.slice(0, 10)}…{n.address.slice(-4)}
                    <span className="ml-2 text-gray-500 font-sans">{n.chain}</span>
                  </div>
                  <div className="text-xs text-gray-300 mt-0.5 truncate">{n.name}</div>
                </div>
                <button
                  onClick={() => deleteNft(n.id)}
                  className="text-gray-600 hover:text-red-400 text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SQL hint */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 font-semibold mb-2">Required Supabase tables (run once in SQL editor):</p>
        <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">{`create table poap_sources (
  id bigint generated always as identity primary key,
  event_id integer unique not null,
  name text not null,
  created_at timestamptz default now()
);

create table nft_sources (
  id bigint generated always as identity primary key,
  address text unique not null,
  chain text not null,
  name text not null,
  created_at timestamptz default now()
);

create table dataset_addresses (
  address text primary key,
  updated_at timestamptz default now()
);`}</pre>
      </div>

    </main>
  )
}
