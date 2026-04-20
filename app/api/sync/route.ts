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

export async function POST() {
  const t0 = Date.now()
  const bySource: { source: string; count: number; error?: string }[] = []
  const allAddresses = new Set<string>()

  // Load sources from Supabase
  const [{ data: poaps }, { data: nfts }] = await Promise.all([
    supabase.from('poap_sources').select('*'),
    supabase.from('nft_sources').select('*'),
  ])

  // Fetch POAP holders
  for (const poap of poaps ?? []) {
    try {
      const result = await fetchPoapHolders(poap.event_id, poap.name)
      result.addresses.forEach(a => allAddresses.add(a))
      bySource.push({ source: result.source, count: result.count })
    } catch (err) {
      bySource.push({ source: `POAP #${poap.event_id} — ${poap.name}`, count: 0, error: String(err) })
    }
    await sleep(400)
  }

  // Fetch NFT holders
  for (const nft of nfts ?? []) {
    try {
      const result = await fetchNftHolders(nft.address, nft.chain, nft.name)
      result.addresses.forEach(a => allAddresses.add(a))
      bySource.push({ source: result.source, count: result.count })
    } catch (err) {
      bySource.push({ source: `NFT ${nft.chain}:${nft.name}`, count: 0, error: String(err) })
    }
    await sleep(400)
  }

  // Upsert into dataset_addresses in batches of 500
  const rows = [...allAddresses].map(a => ({ address: a, updated_at: new Date().toISOString() }))
  for (let i = 0; i < rows.length; i += 500) {
    await supabase
      .from('dataset_addresses')
      .upsert(rows.slice(i, i + 500), { onConflict: 'address' })
  }

  return NextResponse.json({
    total: allAddresses.size,
    bySource,
    durationMs: Date.now() - t0,
  })
}
