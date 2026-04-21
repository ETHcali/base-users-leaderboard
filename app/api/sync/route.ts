import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const POAP_API_KEY = process.env.NEXT_PUBLIC_POAP_API_KEY!

const BLOCKSCOUT: Record<string, string> = {
  base:     'https://base.blockscout.com',
  optimism: 'https://optimism.blockscout.com',
  polygon:  'https://polygon.blockscout.com',
  ethereum: 'https://eth.blockscout.com',
  unichain: 'https://unichain.blockscout.com',
  gnosis:   'https://gnosis.blockscout.com',
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── POAP ────────────────────────────────────────────────────────────────────

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

// ─── NFT via Blockscout /holders (fast primary) ───────────────────────────────

async function fetchHoldersFromEndpoint(baseUrl: string, address: string): Promise<{ addresses: Set<string>; holdersCount: number; totalSupply: number }> {
  const addresses = new Set<string>()
  let nextPageParams: Record<string, string> | null = null

  while (true) {
    let url = `${baseUrl}/api/v2/tokens/${address}/holders`
    if (nextPageParams) url += '?' + new URLSearchParams(nextPageParams).toString()

    const res = await fetch(url, { headers: { 'User-Agent': 'ETHCali-DatasetSync/1.0' } })
    if (!res.ok) throw new Error(`Blockscout /holders HTTP ${res.status}`)
    const data = await res.json()

    const items: { address?: { hash?: string } | string }[] = data?.items ?? []
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

  // Fetch token counters to detect indexing gaps
  let holdersCount = addresses.size
  let totalSupply = 0
  try {
    const cRes = await fetch(`${baseUrl}/api/v2/tokens/${address}/counters`, {
      headers: { 'User-Agent': 'ETHCali-DatasetSync/1.0' },
    })
    if (cRes.ok) {
      const c = await cRes.json()
      holdersCount = parseInt(c.token_holders_count ?? '0', 10) || addresses.size
      // totalSupply from token info
    }
    const tRes = await fetch(`${baseUrl}/api/v2/tokens/${address}`, {
      headers: { 'User-Agent': 'ETHCali-DatasetSync/1.0' },
    })
    if (tRes.ok) {
      const t = await tRes.json()
      totalSupply = parseInt(t.total_supply ?? '0', 10) || 0
    }
  } catch {
    // counters are optional — don't fail the sync
  }

  return { addresses, holdersCount, totalSupply }
}

// ─── NFT via Blockscout /transfers (accurate fallback for bad-index contracts) ─

async function fetchHoldersFromTransfers(baseUrl: string, address: string): Promise<Set<string>> {
  const zero = '0x0000000000000000000000000000000000000000'
  const tokenOwners = new Map<string, string>() // tokenId → currentOwner (ERC-721)
  const erc1155holders = new Set<string>()       // all-time recipients (ERC-1155)
  let nextPageParams: Record<string, string> | null = null

  while (true) {
    let url = `${baseUrl}/api/v2/tokens/${address}/transfers`
    if (nextPageParams) url += '?' + new URLSearchParams(nextPageParams).toString()

    const res = await fetch(url, { headers: { 'User-Agent': 'ETHCali-DatasetSync/1.0' } })
    if (!res.ok) throw new Error(`Blockscout /transfers HTTP ${res.status}`)
    const data = await res.json()

    const items: { from?: { hash?: string }; to?: { hash?: string }; total?: { token_id?: string }; token_ids?: string[] }[] = data?.items ?? []
    if (!items.length) break

    for (const item of items) {
      const to = item.to?.hash?.toLowerCase()

      // ERC-721: token ID is in total.token_id
      const tokenId = item.total?.token_id

      if (tokenId != null) {
        if (to && to !== zero) tokenOwners.set(tokenId, to)
        else tokenOwners.delete(tokenId) // burned
      } else if (item.token_ids?.length) {
        // ERC-1155 batch: collect unique recipients
        if (to && to !== zero) erc1155holders.add(to)
      } else {
        // fallback: collect recipient
        if (to && to !== zero) erc1155holders.add(to)
      }
    }

    nextPageParams = data?.next_page_params ?? null
    if (!nextPageParams) break
    await sleep(300)
  }

  return new Set([...tokenOwners.values(), ...erc1155holders])
}

// ─── Main NFT fetch: holders endpoint + transfer-reconstruction fallback ──────

async function fetchNftHolders(address: string, chain: string, name: string) {
  const baseUrl = BLOCKSCOUT[chain]
  if (!baseUrl) throw new Error(`Chain "${chain}" is not supported (no Blockscout URL)`)

  const { addresses, holdersCount, totalSupply } = await fetchHoldersFromEndpoint(baseUrl, address)

  // Detect Blockscout indexing gap: if reported holders << total_supply, reconstruct from transfers
  const suspicious = totalSupply > 0 && holdersCount > 0 && holdersCount * 4 < totalSupply
  const empty      = addresses.size === 0

  if (empty || suspicious) {
    console.log(`[sync] ${chain}:${name} — holders=${holdersCount} supply=${totalSupply}, using transfer reconstruction`)
    const fallback = await fetchHoldersFromTransfers(baseUrl, address)
    if (fallback.size > addresses.size) {
      return { source: `NFT ${chain}:${name}`, count: fallback.size, addresses: fallback }
    }
  }

  return { source: `NFT ${chain}:${name}`, count: addresses.size, addresses }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const target: { type?: 'poap' | 'nft'; id?: string | number } = body ?? {}

  const t0 = Date.now()
  const bySource: { source: string; count: number; error?: string }[] = []
  const allAddresses = new Set<string>()

  if (target.type === 'poap' && target.id) {
    const eventId = Number(target.id)
    const { data: row } = await supabase.from('poap_sources').select('*').eq('event_id', eventId).single()
    if (!row) return NextResponse.json({ error: 'POAP source not found' }, { status: 404 })

    try {
      const result = await fetchPoapHolders(eventId, row.name)
      result.addresses.forEach(a => allAddresses.add(a))
      bySource.push({ source: result.source, count: result.count })
      const { error } = await supabase.from('poap_sources').update({
        holder_count: result.count,
        last_synced_at: new Date().toISOString(),
      }).eq('event_id', eventId)
      if (error) console.error('Supabase poap update error:', error.message)
    } catch (err) {
      console.error('fetchPoapHolders error:', err)
      bySource.push({ source: `POAP #${eventId}`, count: 0, error: String(err) })
    }

  } else if (target.type === 'nft' && target.id) {
    const address = String(target.id).toLowerCase()
    const { data: row } = await supabase.from('nft_sources').select('*').eq('address', address).single()
    if (!row) return NextResponse.json({ error: 'NFT source not found' }, { status: 404 })

    try {
      const result = await fetchNftHolders(row.address, row.chain, row.name)
      result.addresses.forEach(a => allAddresses.add(a))
      bySource.push({ source: result.source, count: result.count })
      const { error } = await supabase.from('nft_sources').update({
        holder_count: result.count,
        last_synced_at: new Date().toISOString(),
      }).eq('address', address)
      if (error) console.error('Supabase nft update error:', error.message)
    } catch (err) {
      console.error('fetchNftHolders error:', err)
      bySource.push({ source: `NFT ${row.chain}:${row.name}`, count: 0, error: String(err) })
    }

  } else {
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
        console.error(`POAP #${poap.event_id} error:`, err)
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
        console.error(`NFT ${nft.chain}:${nft.name} error:`, err)
        bySource.push({ source: `NFT ${nft.chain}:${nft.name}`, count: 0, error: String(err) })
      }
      await sleep(400)
    }
  }

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
