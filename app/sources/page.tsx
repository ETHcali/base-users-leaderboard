'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '../components/Navbar'
import { supabase } from '@/lib/supabase'

const CHAIN_META: Record<string, { label: string; logo: string }> = {
  base:     { label: 'Base',     logo: '/chains/base logo.svg' },
  optimism: { label: 'Optimism', logo: '/chains/op mainnet.png' },
  polygon:  { label: 'Polygon',  logo: '/chains/polygon.png' },
  ethereum: { label: 'Ethereum', logo: '/chains/ethereum.png' },
  unichain: { label: 'Unichain', logo: '/chains/unichain.png' },
  gnosis:   { label: 'Gnosis',   logo: '/chains/gnosis.png' },
}

type SourceItem = {
  kind: 'poap' | 'nft'
  name: string
  chain: string
  holder_count: number
  event_date: string | null
  id_label: string
  id_link: string
}

type FilterKind = 'all' | 'poap' | 'nft'
type FilterChain = 'all' | string

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState<FilterKind>('all')
  const [chainFilter, setChainFilter] = useState<FilterChain>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: poaps }, { data: nfts }] = await Promise.all([
        supabase.from('poap_sources').select('*').order('created_at', { ascending: false }),
        supabase.from('nft_sources').select('*').order('created_at', { ascending: false }),
      ])
      const items: SourceItem[] = [
        ...(poaps ?? []).map(p => ({
          kind: 'poap' as const,
          name: p.name,
          chain: p.chain ?? 'gnosis',
          holder_count: p.holder_count ?? 0,
          event_date: p.event_date ?? null,
          id_label: `#${p.event_id}`,
          id_link: `https://poap.gallery/drops/${p.event_id}`,
        })),
        ...(nfts ?? []).map(n => ({
          kind: 'nft' as const,
          name: n.name,
          chain: n.chain,
          holder_count: n.holder_count ?? 0,
          event_date: n.event_date ?? null,
          id_label: `${n.address.slice(0, 6)}…${n.address.slice(-4)}`,
          id_link: `https://${n.chain === 'ethereum' ? 'eth' : n.chain}.blockscout.com/address/${n.address}`,
        })),
      ]
      items.sort((a, b) => {
        if (a.event_date && b.event_date) return b.event_date.localeCompare(a.event_date)
        if (a.event_date) return -1
        if (b.event_date) return 1
        return 0
      })
      setSources(items)
      setLoading(false)
    }
    load()
  }, [])

  const activeChains = [...new Set(sources.map(s => s.chain))]

  const filtered = sources.filter(s => {
    if (kindFilter !== 'all' && s.kind !== kindFilter) return false
    if (chainFilter !== 'all' && s.chain !== chainFilter) return false
    return true
  })

  const totalHolders = filtered.reduce((acc, s) => acc + s.holder_count, 0)

  return (
    <>
      <Navbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8 pb-28 md:pb-10">

        {/* Title */}
        <section>
          <p className="font-label text-xs text-[#c7c5d4]/60 uppercase tracking-[0.3em] mb-2">// dataset_sources</p>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-[#e5e2e3] leading-none mb-4">
            EVENTS &amp;<br />COLLECTIONS
          </h1>
          <p className="font-label text-xs text-[#908f9d] uppercase tracking-widest">
            POAPs and NFTs that build the ETH Cali wallet dataset
          </p>
        </section>

        {/* Stats + filters */}
        {!loading && (
          <div className="flex flex-wrap gap-3 items-center">
            {/* Kind filters */}
            {(['all', 'poap', 'nft'] as FilterKind[]).map(k => {
              const count = k === 'all' ? sources.length : sources.filter(s => s.kind === k).length
              const label = k === 'all' ? `All (${count})` : k === 'poap' ? `POAPs (${count})` : `NFTs (${count})`
              return (
                <button key={k} onClick={() => setKindFilter(k)}
                  className={`font-label text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${kindFilter === k ? 'border-[#c0c1ff]/40 text-[#c0c1ff] bg-[#2e3192]/10' : 'border-[#464652]/30 text-[#908f9d] hover:text-[#c0c1ff]'}`}>
                  {label}
                </button>
              )
            })}

            <div className="h-4 w-px bg-[#464652]/30" />

            {/* Chain filters */}
            <button onClick={() => setChainFilter('all')}
              className={`font-label text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${chainFilter === 'all' ? 'border-[#c0c1ff]/40 text-[#c0c1ff] bg-[#2e3192]/10' : 'border-[#464652]/30 text-[#908f9d] hover:text-[#c0c1ff]'}`}>
              All chains
            </button>
            {activeChains.map(c => {
              const meta = CHAIN_META[c]
              return (
                <button key={c} onClick={() => setChainFilter(chainFilter === c ? 'all' : c)}
                  className={`flex items-center gap-1.5 font-label text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${chainFilter === c ? 'border-[#c0c1ff]/40 text-[#c0c1ff] bg-[#2e3192]/10' : 'border-[#464652]/30 text-[#908f9d] hover:text-[#c0c1ff]'}`}>
                  {meta && <img src={meta.logo} alt={meta.label} className="w-3.5 h-3.5 object-contain" />}
                  {meta?.label ?? c}
                </button>
              )
            })}

            <span className="ml-auto font-label text-[10px] text-[#908f9d] uppercase tracking-widest">
              {filtered.length} sources · {totalHolders.toLocaleString()} holders
            </span>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-[#1c1b1c] border border-[#464652]/15 p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 font-label text-[#908f9d] text-xs uppercase tracking-widest">
            No sources match this filter.{' '}
            <button onClick={() => { setKindFilter('all'); setChainFilter('all') }} className="text-[#c0c1ff] hover:underline">Clear</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map((src, i) => {
              const chain = CHAIN_META[src.chain]
              return (
                <div key={i} className="bg-[#1c1b1c] border border-[#464652]/15 p-4 flex items-start gap-3 hover:bg-[#201f20] transition-colors group">
                  {chain && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={chain.logo} alt={chain.label} className="w-7 h-7 object-contain mt-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-label text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-widest border ${
                        src.kind === 'poap'
                          ? 'border-[#c0c1ff]/20 text-[#c0c1ff]'
                          : 'border-[#464652]/40 text-[#908f9d]'
                      }`}>{src.kind}</span>
                      {chain && <span className="font-label text-[9px] text-[#908f9d]">{chain.label}</span>}
                      {src.event_date && (
                        <span className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest ml-auto">
                          {new Date(src.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs text-[#e5e2e3] leading-snug truncate" title={src.name}>{src.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <a href={src.id_link} target="_blank" rel="noopener noreferrer"
                        className="font-label text-[9px] text-[#908f9d] hover:text-[#c0c1ff] transition-colors uppercase tracking-widest">
                        {src.id_label}
                      </a>
                      {src.holder_count > 0 && (
                        <span className="font-headline text-xs font-bold text-[#c0c1ff]">
                          {src.holder_count.toLocaleString()} <span className="font-label text-[9px] font-normal text-[#908f9d]">holders</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 font-label text-[10px] text-[#464652] uppercase tracking-widest pt-4 border-t border-[#464652]/15">
          <div className="flex gap-6">
            <a href="https://ethcali.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">ETH Cali</a>
            <a href="https://dune.com/ethcali" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Dune Analytics</a>
            <a href="https://warpcast.com/ethereumcali.eth" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Farcaster</a>
            <a href="https://twitter.com/ethcali_org" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Twitter</a>
          </div>
          <span>Node: Verified · Protocol: v2.0</span>
        </footer>
      </main>

    </>
  )
}
