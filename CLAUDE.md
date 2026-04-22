@AGENTS.md

# ETH Cali — Multi-Chain Activity Leaderboard · Maintainer Reference

## Project summary

Onchain activity leaderboard for wallets onboarded by [ETH Cali](https://ethcali.org), a Colombian Web3 education community. Users connect their wallet to see their rank across 6 chains and check eligibility for the ETH Cali OG NFT (top 30 on Base).

**Live:** https://web-5dwc86s2h-ekinoxis-team.vercel.app  
**Repo:** https://github.com/ETHcali/base-users-leaderboard  
**Dune Dashboard:** https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali  
**Supabase project ID:** `eqiqsaobvijyfbegzsqd`

---

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS 4**
- **wagmi v2** + **RainbowKit v2** — wallet connect (Base network)
- **Dune Analytics API** — multi-chain leaderboard data (6 queries, one per chain)
- **Supabase** — user registrations, POAP/NFT sources, wallet dataset
- **POAP API** — fetch holders per event ID
- **Blockscout REST API** — fetch NFT holders per contract
- **Vercel** — hosting, auto-deploy on push to `main`

> ⚠️ RainbowKit 2 requires wagmi v2 (`^2.9.0`). Do NOT upgrade wagmi to v3.

---

## Available MCP tools — use these before writing code

These are available as MCP tools in the Claude Code session. Using them avoids round-trips that waste tokens.

### Supabase MCP (`mcp__claude_ai_Supabase__*`)
Run SQL, apply migrations, inspect schema — without leaving the session.
- `execute_sql` — run any SQL query against project `eqiqsaobvijyfbegzsqd`
- `list_tables` — inspect schema
- `apply_migration` — apply a migration file
- `get_logs` — check recent Supabase logs

**When to use:** Adding columns, checking if a migration ran, verifying row data, debugging query results.

### Dune MCP (`mcp__dune__*`)
Query and manage Dune Analytics programmatically.
- `executeQueryById` — run a saved query and get results
- `getExecutionResults` — fetch results of a previous execution
- `getDuneQuery` — inspect a query's SQL
- `updateDuneQuery` — edit query SQL
- `searchTables` — discover available Dune tables

**When to use:** Checking live leaderboard data, verifying query output, updating SQL templates.

### Blockscout MCP (`mcp__blockscout__*`)
Multichain blockchain data — no API key needed.
- `get_address_info` — wallet overview (balance, tx count)
- `get_transactions_by_address` — tx history with filters
- `get_token_transfers_by_address` — ERC-20 transfers
- `get_tokens_by_address` — token holdings
- `nft_tokens_by_address` — NFT holdings
- `get_contract_abi` / `inspect_contract_code` — contract inspection
- `direct_api_call` — any Blockscout API endpoint

**Chain IDs:** Ethereum=1, Base=8453, Optimism=10, Polygon=137, Gnosis=100, Unichain=1301  
**When to use:** Verifying holder counts, checking wallet activity, debugging sync results.

### blockscout-analysis skill
Invoked via `/blockscout-analysis`. Provides structured blockchain analysis workflow — use when the task involves interpreting on-chain patterns across multiple wallets or chains.

---

## App routes

| Route | Audience | Description |
|-------|----------|-------------|
| `/` | Public | Multi-chain leaderboard — chain tabs, sortable table, wallet connect, register flow |
| `/sources` | Public | All POAP events + NFT contracts in the dataset, filterable by type and chain |
| `/about` | Public | Score formula explanation, metric definitions |
| `/profile` | Connected wallet | Wallet profile — registration data, per-chain metrics, inline OG NFT claim for Base top 30 |
| `/claim` | Connected wallet | Legacy claim page — still exists but claim is now embedded in `/profile` |
| `/admin` | Admin | Redirects to `/admin/dashboard` |
| `/admin/dashboard` | Admin | Dataset KPIs + per-chain Dune stats + Run Sync button |
| `/admin/sources` | Admin | Add/remove POAP event IDs and NFT contracts, trigger sync |
| `/admin/dataset` | Admin | Browse all unique wallet addresses, export CSV |
| `/admin/users` | Admin | Registered users with Dune data, filter by top 30 |
| `/admin/top30` | Admin | Dune top 30 × registered users × dataset — NFT mint reconciliation |
| `/api/sync` | Server (POST) | Fetch all POAP + NFT holders server-side, upsert into dataset_addresses |

---

## Key files

| File | Purpose |
|------|---------|
| `app/components/Navbar.tsx` | **Shared navbar** — desktop header + mobile header + mobile bottom nav. Uses `usePathname()` for active state. Edit once, applies everywhere. |
| `app/components/RegisterModal.tsx` | Registration modal — name, email, X, Telegram, WhatsApp, country |
| `app/page.tsx` | Main leaderboard — chain tabs, Dune fetch, sortable table, wallet connect |
| `app/sources/page.tsx` | Public sources page — POAP/NFT grid with filters |
| `app/about/page.tsx` | Score formula + metric definitions |
| `app/profile/page.tsx` | User profile + per-chain metrics + inline OG NFT claim |
| `app/admin/layout.tsx` | Admin shell — auth gate (sessionStorage) + sidebar nav |
| `app/admin/dashboard/page.tsx` | Admin overview — KPI cards + per-chain stats + Run Sync |
| `app/admin/sources/page.tsx` | Sources CRUD — unified POAP/NFT table, inline edit, per-row sync |
| `app/admin/dataset/page.tsx` | Dataset browser — paginated addresses, search, CSV export |
| `app/admin/users/page.tsx` | Registered users — Dune-enriched table, Top-30 filter, CSV export |
| `app/admin/top30/page.tsx` | Top-30 reconciliation — rank × users × dataset, mailto claim |
| `app/api/sync/route.ts` | POST /api/sync — server-side POAP + Blockscout holder fetch + upsert |
| `app/providers.tsx` | WagmiProvider + RainbowKitProvider + QueryClientProvider |
| `app/layout.tsx` | Root layout — fonts, metadata, favicon, suppressHydrationWarning on `<html>` |
| `lib/supabase.ts` | Supabase client + UserProfile type |
| `supabase/migrations/` | SQL migration history — run via Supabase MCP, not manually |
| `docsdune/queries/` | SQL templates for each chain query |

---

## Component architecture rules

- **Never duplicate nav markup.** All public pages use `<Navbar />` from `app/components/Navbar.tsx`. Active state is automatic via `usePathname()`.
- **Nav items:** Leaderboard · Sources · About · Profile (no Terminal, no Claim link — admin accessed directly at `/admin/dashboard`).
- **Mobile bottom nav:** same 4 items, same component.
- Adding a new public page = add one entry to `NAV_ITEMS` in `Navbar.tsx`.

---

## Dune data

**Dataset table:** `dune.ethcali.dataset_users_onboarded_eth_cali` — fed from Supabase `dataset_addresses`

| Chain | Env var | Query ID |
|-------|---------|----------|
| Base | `NEXT_PUBLIC_DUNE_QUERY_ID_BASE` | [6634911](https://dune.com/queries/6634911) |
| Ethereum | `NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM` | [7347012](https://dune.com/queries/7347012) |
| Optimism | `NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM` | [7346993](https://dune.com/queries/7346993) |
| Polygon | `NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON` | [7346995](https://dune.com/queries/7346995) |
| Gnosis | `NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS` | [7346996](https://dune.com/queries/7346996) |
| Unichain | `NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN` | [7346997](https://dune.com/queries/7346997) |

### Score formula (all chains)
```
score = (native_tx_count × 1) + (token_tx_count × 2) + (total_token_volume_usd / 100) + (contracts_deployed × 3)
```

### Dune row shape (all chain queries return same columns)
```typescript
type Row = {
  address: string
  native_tx_count: number
  token_tx_count: number
  total_token_volume_usd: number
  contracts_deployed: number
  activity_score: number
  first_tx_time: string | null
  last_tx_time: string | null
}
```

---

## Supabase schema

### `users` — registered claimants
| Column | Type | Notes |
|--------|------|-------|
| `wallet_address` | TEXT PK | lowercase |
| `name` | TEXT | required |
| `email` | TEXT | optional |
| `x_username` | TEXT | optional |
| `telegram_handle` | TEXT | optional |
| `whatsapp` | TEXT | optional |
| `country_code` | TEXT | optional |
| `registered_at` | TIMESTAMPTZ | |

### `poap_sources`
| Column | Type | Notes |
|--------|------|-------|
| `event_id` | INTEGER UNIQUE | POAP drop ID |
| `name` | TEXT | event label |
| `chain` | TEXT | default `gnosis` |
| `holder_count` | INTEGER | updated on sync |
| `event_date` | DATE | optional |
| `last_synced_at` | TIMESTAMPTZ | |

### `nft_sources`
| Column | Type | Notes |
|--------|------|-------|
| `address` | TEXT UNIQUE | lowercase contract address |
| `chain` | TEXT | base / optimism / polygon / ethereum / unichain |
| `name` | TEXT | event label |
| `holder_count` | INTEGER | updated on sync |
| `event_date` | DATE | optional |
| `last_synced_at` | TIMESTAMPTZ | |

### `dataset_addresses`
| Column | Type | Notes |
|--------|------|-------|
| `address` | TEXT PK | lowercase |
| `updated_at` | TIMESTAMPTZ | last sync timestamp |

**Migration workflow:** Write SQL in `supabase/migrations/`, then apply via Supabase MCP `execute_sql` tool (project `eqiqsaobvijyfbegzsqd`). Never run migrations manually.

---

## Design system

Dark sci-fi aesthetic. Key color tokens:

| Token | Value | Use |
|-------|-------|-----|
| Background | `#131314` | page bg |
| Surface | `#1c1b1c` | cards, panels |
| Surface low | `#0e0e0f` | deeper panels |
| Border | `#464652` | borders (use `/15`–`/30` opacity) |
| Text primary | `#e5e2e3` | data values, headings |
| Text secondary | `#908f9d` | labels, metadata |
| Accent | `#c0c1ff` | active states, scores, highlights |
| Accent dark | `#2e3192` | gradients, backgrounds |

**Contrast rule:** Labels use `text-[#908f9d]`, data values use `text-[#e5e2e3]`, accent/interactive use `text-[#c0c1ff]`. Never use `text-[#464652]` for readable text — it's near-invisible on the dark background (border use only).

**Fonts:**
- `font-headline` → Plus Jakarta Sans (bold display)
- `font-body` → Space Grotesk (readable text)
- `font-label` → uppercase tracking-widest micro-labels
- `font-mono` → wallet addresses, code

---

## Dataset sync flow

1. Admin adds POAP event IDs / NFT contracts via `/admin/sources`
2. Admin clicks **Run Sync** → `POST /api/sync` (server-side to avoid CORS)
3. Server fetches POAP API (`/event/{id}/poaps`, paginated 300/page) and Blockscout (`/api/v2/tokens/{address}/holders`)
4. Addresses deduplicated → upserted into `dataset_addresses`
5. Admin exports CSV from `/admin/dataset` → uploads to Dune to refresh the dataset

---

## Blockscout chain URLs

| Chain | Blockscout URL |
|-------|---------------|
| Base | https://base.blockscout.com |
| Optimism | https://optimism.blockscout.com |
| Polygon | https://polygon.blockscout.com |
| Ethereum | https://eth.blockscout.com |
| Unichain | https://unichain.blockscout.com |

POAPs use Gnosis chain but are fetched via POAP API, not Blockscout.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_DUNE_API_KEY` | Dune API access |
| `NEXT_PUBLIC_DUNE_QUERY_ID_BASE` | 6634911 |
| `NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM` | 7347012 |
| `NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM` | 7346993 |
| `NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON` | 7346995 |
| `NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS` | 7346996 |
| `NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN` | 7346997 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Admin panel password (sessionStorage-cached) |
| `NEXT_PUBLIC_POAP_API_KEY` | POAP API key (server-side sync) |
| `ETHERSCAN_API_KEY` | Fallback NFT sync when Blockscout fails |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect cloud |

---

## Roadmap

- [x] Multi-chain leaderboard — Base, Ethereum, Optimism, Polygon, Gnosis, Unichain
- [x] Sortable table (click any column header)
- [x] Wallet connect + top-30 eligibility
- [x] User registration via Supabase
- [x] Shared `<Navbar />` component — active state via `usePathname()`
- [x] `/sources` — public POAP/NFT source browser with filters
- [x] `/about` — score formula + metric definitions
- [x] `/profile` — per-chain metrics + inline OG NFT claim (Base top 30)
- [x] Admin panel — dashboard, sources, dataset, users, top30
- [x] Server-side dataset sync (POAP + Blockscout)
- [x] Sources manager — unified table, inline edit, per-row sync, event dates
- [x] Total volume metric in admin dashboard
- [ ] ERC-721 OG NFT contract on Base — on-chain mint for top 30
- [ ] Merkle whitelist script — reads top 30 from Dune, updates contract allowlist
- [ ] Automate dataset sync (Vercel cron / GitHub Actions)
