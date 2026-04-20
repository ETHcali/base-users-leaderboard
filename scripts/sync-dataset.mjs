#!/usr/bin/env node
/**
 * sync-dataset.mjs
 *
 * Collects unique wallet addresses from all ETH Cali POAP events and
 * Unlock Protocol NFT contracts, then writes a CSV ready for Dune upload.
 *
 * Usage:
 *   NEXT_PUBLIC_POAP_API_KEY=xxx node scripts/sync-dataset.mjs
 *
 * Output:
 *   public/dataset.csv        — unique addresses (one per row)
 *   public/dataset-log.json   — run summary with counts per source
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const POAP_API_KEY = process.env.NEXT_PUBLIC_POAP_API_KEY ?? ''

if (!POAP_API_KEY) {
  console.error('ERROR: NEXT_PUBLIC_POAP_API_KEY is not set.')
  process.exit(1)
}

// ─── Config ──────────────────────────────────────────────────────────────────

const POAP_EVENTS = [
  { id: 147806, name: 'Ethereum Birthday - Empresarios Web3 (2023)' },
  { id: 147944, name: 'Workshop: Set-up en EVM (2023)' },
  { id: 150539, name: 'Ethereum Starter Pack - NFT 101 (2023)' },
  { id: 157654, name: 'Data DAY UAO (2023)' },
  { id: 195225, name: 'Destino Devconnect - Ethereum Birthday 2025' },
  { id: 197326, name: 'Curso DEFI USB - Infraestructura web3' },
  { id: 197331, name: 'Curso DEFI USB - Un Mundo tokenizado' },
  { id: 198655, name: 'Curso DEFI USB - Apps and Protocols DeFi' },
  { id: 198658, name: 'Curso DEFI USB - TradFi vs Defi' },
  { id: 201984, name: 'Curso DEFI USB - DAOs y Gobernanza' },
  { id: 202090, name: 'Curso DEFI USB - Web3 Funding I' },
  { id: 205678, name: 'Curso DEFI USB - Web3 Funding II' },
  { id: 205884, name: 'Curso DEFI USB - Mercados con AI' },
  { id: 209387, name: 'Crea tu app en Ethereum' },
  { id: 211588, name: 'Coworking ETHGlobal x ETHCALI Cali 2025' },
  { id: 218106, name: 'Uniswap Day' },
  { id: 224092, name: 'Get ready with ETH CALI for Hack Money 2026' },
]

// Blockscout REST API base URLs per chain
const BLOCKSCOUT_BASE = {
  base:     'https://base.blockscout.com',
  optimism: 'https://optimism.blockscout.com',
  polygon:  'https://polygon.blockscout.com',
}

const NFT_CONTRACTS = [
  // Optimism
  { address: '0xce984f9e6335198fff193cc0596489dc9e570f3f', chain: 'optimism', name: 'Papayogin' },
  { address: '0xfcf03741a264a00fda35a5814e669968cab95204', chain: 'optimism', name: 'Ethereum Starter Pack - Seguridad en WEB3' },
  { address: '0x9eb1dc77ac01b823f94c25ea054650930a3b7050', chain: 'optimism', name: 'Proof-of-Stake en Ramada Cafe' },
  { address: '0x62a2c557092eafe5c24151ed8e52ecaba6ac44a7', chain: 'optimism', name: 'Financiando bienes publicos con Giveth' },
  { address: '0xdf3bed18e02daeb29e2bbc39c04773578d0fd1c8', chain: 'optimism', name: 'Hackathon USC' },
  // Polygon
  { address: '0x70bd76e89478400d9ee4c0f1200e53e751610ecf', chain: 'polygon', name: 'Ethereum Starter Pack - DeFi' },
  { address: '0xc67db733d754753ca19a3502f36756e9e4141cbd', chain: 'polygon', name: 'Ramada Cafe Opening' },
  { address: '0x2296e9d389a8c7dc2598d197e9fe43ea12052883', chain: 'polygon', name: 'Taller Solidity ICESI' },
  // Base
  { address: '0x1337722f177e99c8cd490f432a319d8c7a003ea8', chain: 'base', name: 'Drumcode Cali General' },
  { address: '0x0eceaa7c20becaf159f362b48b19b3bcb44780bd', chain: 'base', name: 'Drumcode Cali General Anytime' },
  { address: '0x114f67f5ca3656618dd5648d31e50ac8c0dac046', chain: 'base', name: 'Drumcode Cali VIP' },
  { address: '0xeeb48f34e083d1c0069593424dc0dd6055fd04e8', chain: 'base', name: 'Drumcode Cali Backstage' },
  { address: '0x8db8003c692d68dd20722eda6fc4de8708cd5ed6', chain: 'base', name: 'Activacion Discoteca 1060' },
  { address: '0x19f7b2834ca07ececefc21202714b3c667588aa9', chain: 'base', name: 'BASE Community Meetup (x3 editions)' },
  { address: '0x2744a0d99fc319c37d72ae9e98cba1b351bc37d5', chain: 'base', name: 'Hackathon WEB3 Cali' },
  { address: '0x7082f47ca600240f41a2fbee26a894d875a63b2f', chain: 'base', name: 'Open House USB' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.status === 429) {
        const wait = (i + 1) * 2000
        console.log(`  Rate limited — waiting ${wait}ms...`)
        await sleep(wait)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
      return await res.json()
    } catch (err) {
      if (i === retries - 1) throw err
      await sleep(1000 * (i + 1))
    }
  }
}

// ─── POAP fetcher ─────────────────────────────────────────────────────────────

async function fetchPoapHolders(event) {
  const addresses = new Set()
  const limit = 300
  let offset = 0
  let total = null

  console.log(`  POAP #${event.id} — ${event.name}`)

  while (true) {
    const url = `https://api.poap.tech/event/${event.id}/poaps?limit=${limit}&offset=${offset}`
    const data = await fetchWithRetry(url, {
      headers: { 'x-api-key': POAP_API_KEY },
    })

    if (!data?.tokens?.length) break
    total ??= data.total

    for (const token of data.tokens) {
      const addr = token.owner?.id?.toLowerCase()
      if (addr && addr.startsWith('0x')) addresses.add(addr)
    }

    offset += limit
    if (offset >= total) break
    await sleep(200)
  }

  console.log(`    → ${addresses.size} addresses (total tokens: ${total ?? 0})`)
  return { source: `POAP #${event.id}`, name: event.name, count: addresses.size, addresses }
}

// ─── Blockscout fetcher ───────────────────────────────────────────────────────

async function fetchNftHolders(contract) {
  const addresses = new Set()
  const base = BLOCKSCOUT_BASE[contract.chain]
  let nextPageParams = null

  console.log(`  NFT ${contract.name} (${contract.chain}) — ${contract.address}`)

  while (true) {
    let url = `${base}/api/v2/tokens/${contract.address}/holders`
    if (nextPageParams) {
      const qs = new URLSearchParams(nextPageParams).toString()
      url += `?${qs}`
    }

    let data
    try {
      data = await fetchWithRetry(url)
    } catch (err) {
      console.log(`    ⚠ Blockscout error: ${err.message}`)
      break
    }

    const items = data?.items ?? []
    if (!items.length) break

    for (const item of items) {
      const addr = (item.address?.hash ?? item.address?.toLowerCase())
      if (addr && typeof addr === 'string' && addr.startsWith('0x')) {
        addresses.add(addr.toLowerCase())
      }
    }

    nextPageParams = data?.next_page_params ?? null
    if (!nextPageParams) break
    await sleep(300)
  }

  console.log(`    → ${addresses.size} holders`)
  return { source: `NFT ${contract.chain}:${contract.address.slice(0, 10)}`, name: contract.name, count: addresses.size, addresses }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 ETH Cali — dataset sync\n')
  const allAddresses = new Set()
  const log = { runAt: new Date().toISOString(), sources: [] }

  // POAPs
  console.log(`📍 Fetching ${POAP_EVENTS.length} POAP events...\n`)
  for (const event of POAP_EVENTS) {
    try {
      const result = await fetchPoapHolders(event)
      result.addresses.forEach(a => allAddresses.add(a))
      log.sources.push({ type: 'poap', id: event.id, name: event.name, holders: result.count })
    } catch (err) {
      console.log(`    ⚠ Failed: ${err.message}`)
      log.sources.push({ type: 'poap', id: event.id, name: event.name, holders: 0, error: err.message })
    }
    await sleep(400)
  }

  // NFTs
  console.log(`\n🪙 Fetching ${NFT_CONTRACTS.length} NFT contracts...\n`)
  for (const contract of NFT_CONTRACTS) {
    try {
      const result = await fetchNftHolders(contract)
      result.addresses.forEach(a => allAddresses.add(a))
      log.sources.push({ type: 'nft', chain: contract.chain, address: contract.address, name: contract.name, holders: result.count })
    } catch (err) {
      console.log(`    ⚠ Failed: ${err.message}`)
      log.sources.push({ type: 'nft', chain: contract.chain, address: contract.address, name: contract.name, holders: 0, error: err.message })
    }
    await sleep(400)
  }

  // Write CSV — single column "address" for Dune upload
  const csv = 'address\n' + [...allAddresses].sort().join('\n')
  const csvPath = path.join(ROOT, 'public', 'dataset.csv')
  writeFileSync(csvPath, csv, 'utf-8')

  // Write log
  log.totalUniqueAddresses = allAddresses.size
  const logPath = path.join(ROOT, 'public', 'dataset-log.json')
  writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8')

  console.log(`\n✅ Done!`)
  console.log(`   Unique addresses : ${allAddresses.size}`)
  console.log(`   CSV              : public/dataset.csv`)
  console.log(`   Log              : public/dataset-log.json`)
  console.log(`\n📤 Next step: upload public/dataset.csv to Dune as dataset_users_onboarded_eth_cali\n`)
}

main().catch(err => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
