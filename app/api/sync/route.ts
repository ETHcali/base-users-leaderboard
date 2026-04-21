import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const POAP_API_KEY      = process.env.NEXT_PUBLIC_POAP_API_KEY!
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY!

const BLOCKSCOUT: Record<string, string> = {
  base:     'https://base.blockscout.com',
  optimism: 'https://optimism.blockscout.com',
  polygon:  'https://polygon.blockscout.com',
  ethereum: 'https://eth.blockscout.com',
  unichain: 'https://unichain.blockscout.com',
}

const ETHERSCAN_CHAIN_ID: Record<string, number> = {
  ethereum: 1,
  base:     8453,
  optimism: 10,
  polygon:  137,
  unichain: 1301,
  gnosis:   100,
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

async function fetchNftHoldersBlockscout(address: string, chain: string, name: string) {
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

  return { source: `NFT ${chain}:${name} (Blockscout)`, count: addresses.size, addresses }
}

async function fetchNftHoldersEtherscan(address: string, chain: string, name: string) {
  const chainId = ETHERSCAN_CHAIN_ID[chain]
  if (!chainId) throw new Error(`No Etherscan chain ID for chain: ${chain}`)

  // Reconstruct current holders from transfer history:
  // For each tokenId, track last `to` address = current holder
  const tokenOwners = new Map<string, string>()
  let page = 1

  while (true) {
    const url = `https://api.etherscan.io/v2/api?module=account&action=tokennfttx` +
      `&contractaddress=${address}&chainid=${chainId}` +
      `&page=${page}&offset=10000&sort=asc&apikey=${ETHERSCAN_API_KEY}`

    const res = await fetch(url, { headers: { 'User-Agent': 'ETHCali-DatasetSync/1.0' } })
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
    const data = await res.json()

    if (data.status === '0' || !Array.isArray(data.result)) break

    const transfers: { tokenID: string; to: string; from: string }[] = data.result
    if (!transfers.length) break

    for (const tx of transfers) {
      const to = tx.to?.toLowerCase()
      if (to && to !== '0x0000000000000000000000000000000000000000') {
        tokenOwners.set(tx.tokenID, to)
      } else {
        // burned — remove
        tokenOwners.delete(tx.tokenID)
      }
    }

    // Etherscan max offset is 10000; if we got fewer, we're done
    if (transfers.length < 10000) break
    page++
    await sleep(250)
  }

  const addresses = new Set(tokenOwners.values())
  return { source: `NFT ${chain}:${name} (Etherscan)`, count: addresses.size, addresses }
}

async function fetchNftHolders(address: string, chain: string, name: string) {
  // Try Blockscout first; fall back to Etherscan if it fails or returns nothing
  try {
    const result = await fetchNftHoldersBlockscout(address, chain, name)
    if (result.count > 0) return result
    console.log(`Blockscout returned 0 for ${chain}:${name}, trying Etherscan…`)
  } catch (err) {
    console.log(`Blockscout failed for ${chain}:${name} (${err}), trying Etherscan…`)
  }
  return fetchNftHoldersEtherscan(address, chain, name)
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
