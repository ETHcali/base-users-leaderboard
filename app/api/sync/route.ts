import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const POAP_API_KEY = process.env.NEXT_PUBLIC_POAP_API_KEY!

const BLOCKSCOUT: Record<string, string> = {
  base:     'https://base.blockscout.com',
  optimism: 'https://optimism.blockscout.com',
  polygon:  'https://polygon.blockscout.com',
  ethereum: 'https://eth.blockscout.com',
  unichain: 'https://unichain.blockscout.com',
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchPoapHolders(eventId: number, name: string) {
  const addresses = new Set<string>()
  let offset = 0
  let total: number | null = null

  while (true) {
    const res = await fetch(
      `https://api.poap.tech/event/${eventId}/poaps?limit=300&offset=${offset}`,
      { headers: { 'x-api-key': POAP_API_KEY } }
    )
    if (!res.ok) throw new Error(`POAP API HTTP ${res.status}`)
    const data = await res.json()
    if (!data?.tokens?.length) break
    total ??= data.total
    for (const t of data.tokens) {
      const a = t.owner?.id?.toLowerCase()
      if (a?.startsWith('0x')) addresses.add(a)
    }
    offset += 300
    if (offset >= (total ?? 0)) break
    await sleep(200)
  }

  return { source: `POAP #${eventId} — ${name}`, count: addresses.size, addresses }
}

async function fetchNftHolders(address: string, chain: string, name: string) {
  const addresses = new Set<string>()
  const base = BLOCKSCOUT[chain] ?? BLOCKSCOUT.base
  let nextPageParams: Record<string, string> | null = null

  while (true) {
    let url = `${base}/api/v2/tokens/${address}/holders`
    if (nextPageParams) url += '?' + new URLSearchParams(nextPageParams).toString()

    const res = await fetch(url, { headers: { 'User-Agent': 'ETHCali-DatasetSync/1.0' } })
    if (!res.ok) throw new Error(`Blockscout HTTP ${res.status} (${chain})`)
    const data = await res.json()

    const items: { address?: { hash?: string } | string }[] = data?.items ?? []
    if (!items.length) break

    for (const item of items) {
      const raw = typeof item.address === 'string'
        ? item.address
        : (item.address as { hash?: string })?.hash
      const a = raw?.toLowerCase()
      if (a?.startsWith('0x')) addresses.add(a)
    }

    nextPageParams = data?.next_page_params ?? null
    if (!nextPageParams) break
    await sleep(300)
  }

  return { source: `NFT ${chain}:${name}`, count: addresses.size, addresses }
}

// Body shape:
//   {} or omitted          → sync all sources
//   { type: 'poap', id }   → sync one POAP event
//   { type: 'nft', id }    → sync one NFT contract (id = address)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const target: { type?: 'poap' | 'nft'; id?: string | number } = body ?? {}

  const t0 = Date.now()
  const bySource: { source: string; count: number; error?: string }[] = []
  const allAddresses = new Set<string>()

  if (target.type === 'poap' && target.id) {
    // Single POAP sync
    const eventId = Number(target.id)
    const { data: row } = await supabase.from('poap_sources').select('*').eq('event_id', eventId).single()
    if (!row) return NextResponse.json({ error: 'POAP source not found' }, { status: 404 })

    try {
      const result = await fetchPoapHolders(eventId, row.name)
      result.addresses.forEach(a => allAddresses.add(a))
      bySource.push({ source: result.source, count: result.count })
      await supabase.from('poap_sources').update({
        holder_count: result.count,
        last_synced_at: new Date().toISOString(),
      }).eq('event_id', eventId)
    } catch (err) {
      bySource.push({ source: `POAP #${eventId}`, count: 0, error: String(err) })
    }

  } else if (target.type === 'nft' && target.id) {
    // Single NFT sync
    const address = String(target.id).toLowerCase()
    const { data: row } = await supabase.from('nft_sources').select('*').eq('address', address).single()
    if (!row) return NextResponse.json({ error: 'NFT source not found' }, { status: 404 })

    try {
      const result = await fetchNftHolders(row.address, row.chain, row.name)
      result.addresses.forEach(a => allAddresses.add(a))
      bySource.push({ source: result.source, count: result.count })
      await supabase.from('nft_sources').update({
        holder_count: result.count,
        last_synced_at: new Date().toISOString(),
      }).eq('address', address)
    } catch (err) {
      bySource.push({ source: `NFT ${row.chain}:${row.name}`, count: 0, error: String(err) })
    }

  } else {
    // Sync all sources
    const [{ data: poaps }, { data: nfts }] = await Promise.all([
      supabase.from('poap_sources').select('*'),
      supabase.from('nft_sources').select('*'),
    ])

    for (const poap of poaps ?? []) {
      try {
        const result = await fetchPoapHolders(poap.event_id, poap.name)
        result.addresses.forEach(a => allAddresses.add(a))
        bySource.push({ source: result.source, count: result.count })
        await supabase.from('poap_sources').update({
          holder_count: result.count,
          last_synced_at: new Date().toISOString(),
        }).eq('event_id', poap.event_id)
      } catch (err) {
        bySource.push({ source: `POAP #${poap.event_id} — ${poap.name}`, count: 0, error: String(err) })
      }
      await sleep(400)
    }

    for (const nft of nfts ?? []) {
      try {
        const result = await fetchNftHolders(nft.address, nft.chain, nft.name)
        result.addresses.forEach(a => allAddresses.add(a))
        bySource.push({ source: result.source, count: result.count })
        await supabase.from('nft_sources').update({
          holder_count: result.count,
          last_synced_at: new Date().toISOString(),
        }).eq('address', nft.address)
      } catch (err) {
        bySource.push({ source: `NFT ${nft.chain}:${nft.name}`, count: 0, error: String(err) })
      }
      await sleep(400)
    }
  }

  // Upsert collected addresses into dataset_addresses
  const rows = [...allAddresses].map(a => ({ address: a, updated_at: new Date().toISOString() }))
  for (let i = 0; i < rows.length; i += 500) {
    await supabase.from('dataset_addresses').upsert(rows.slice(i, i + 500), { onConflict: 'address' })
  }

  return NextResponse.json({
    total: allAddresses.size,
    bySource,
    durationMs: Date.now() - t0,
  })
}
