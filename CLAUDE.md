@AGENTS.md

# ETH Cali — Base Users Leaderboard

## Project overview

Onchain activity leaderboard for wallets onboarded by [ETH Cali](https://ethcali.org), a Colombian Web3 education community. Users connect their wallet to see their rank and check eligibility for the ETH Cali OG NFT (top 30).

Live: https://web-5dwc86s2h-ekinoxis-team.vercel.app  
Repo: https://github.com/ETHcali/base-users-leaderboard  
Dune Dashboard: https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS 4**
- **wagmi v2** + **RainbowKit v2** — wallet connect (any wallet, Base network)
- **Dune Analytics API** — leaderboard data (query 6634911)
- **Supabase** — user registrations, dataset sources, wallet address dataset
- **POAP API** — fetch holders per event ID
- **Blockscout REST API** — fetch NFT holders per contract (multi-chain)
- **Vercel** — hosting, auto-deploy on push to `main`

> ⚠️ RainbowKit 2 requires wagmi v2 (`^2.9.0`). Do NOT upgrade wagmi to v3 — it breaks the peer dependency.

## Key files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main leaderboard — Dune fetch, wallet check, 8-metric stats grid, registration flow |
| `app/claim/page.tsx` | Claim page — top-30 eligibility check, onchain metrics card, OG NFT claim submit |
| `app/admin/layout.tsx` | Shared admin shell — single auth gate (sessionStorage) + sidebar nav |
| `app/admin/dashboard/page.tsx` | Admin overview — 5 KPI cards + Run Sync + quick links |
| `app/admin/sources/page.tsx` | Sources manager — unified POAP/NFT table with chain logos, filters, add/remove |
| `app/admin/dataset/page.tsx` | Dataset browser — paginated unique addresses, search, CSV export |
| `app/admin/users/page.tsx` | Registered users — Dune-enriched table, Top-30 filter, CSV export |
| `app/admin/top30/page.tsx` | Top-30 reconciliation — Dune rank joined with users + dataset, mailto claim button |
| `app/api/sync/route.ts` | POST /api/sync — server-side: fetches POAP + Blockscout holders, upserts to dataset_addresses |
| `app/components/RegisterModal.tsx` | Registration modal — name, email, X, Telegram, WhatsApp, country |
| `app/providers.tsx` | WagmiProvider + RainbowKitProvider + QueryClientProvider |
| `app/layout.tsx` | Root layout, metadata, favicon (ETH Cali branding PNG) |
| `lib/supabase.ts` | Supabase client + UserProfile type |
| `scripts/sync-dataset.mjs` | CLI equivalent of /api/sync — run with `npm run sync-dataset`, outputs public/dataset.csv |
| `public/branding/` | ETH Cali logos — favicon, claim page hero |
| `public/chains/` | Chain logos: base, ethereum, gnosis, optimism, polygon, unichain |
| `public/nfts and poaps distributed - Sheet1.csv` | Source CSV of all ETH Cali events (canonical reference) |
| `docsdune/` | Dune CLI, MCP, and query pattern reference docs |
| `docspoap/` | POAP API endpoint reference docs |
| `supabase/migrations/` | SQL migration history |

## App routes

| Route | Who | Description |
|-------|-----|-------------|
| `/` | Public | Leaderboard, wallet connect, register flow |
| `/claim` | Connected wallet | Eligibility check + OG NFT claim |
| `/admin` | Admin | Redirects to `/admin/dashboard` |
| `/admin/dashboard` | Admin | KPIs: sources, dataset size, registered users, top-30 registered |
| `/admin/sources` | Admin | Add/remove POAP event IDs and NFT contracts, trigger sync |
| `/admin/dataset` | Admin | Browse all unique wallet addresses, export CSV |
| `/admin/users` | Admin | All registered users with Dune data, filter by top 30 |
| `/admin/top30` | Admin | Dune top 30 × registered users × dataset — operational NFT mint screen |
| `/api/sync` | Server (POST) | Fetch all POAP + NFT holders server-side, upsert into dataset_addresses |

## Dune data

- **Dataset**: `dune.ethcali.dataset_users_onboarded_eth_cali` — wallet addresses fed from Supabase `dataset_addresses`
- **Main query**: [6634911](https://dune.com/queries/6634911) — Base Network activity per wallet
- **Chain**: Base (all-time since Aug 2023 launch)

### Score formula

```
score = (native_tx_count × 1) + (token_tx_count × 2) + (total_token_volume_usd / 100) + (contracts_deployed × 3)
```

## Dataset sync flow

1. Admin adds POAP event IDs to `poap_sources` and NFT contracts to `nft_sources` via `/admin/sources`
2. Admin clicks **Run Sync** → calls `POST /api/sync` (server-side to avoid CORS)
3. Server fetches all holders from POAP API (`/event/{id}/poaps`, paginated 300/page) and Blockscout (`/api/v2/tokens/{address}/holders`, cursor-paginated)
4. All addresses are deduplicated and upserted into `dataset_addresses`
5. Admin exports CSV from `/admin/dataset` and uploads to Dune to refresh the leaderboard dataset

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

### `poap_sources` — POAP event IDs to sync
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | auto |
| `event_id` | INTEGER UNIQUE | POAP drop ID |
| `name` | TEXT | event label |
| `created_at` | TIMESTAMPTZ | |

### `nft_sources` — NFT contracts to sync
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | auto |
| `address` | TEXT UNIQUE | lowercase contract address |
| `chain` | TEXT | base / optimism / polygon / ethereum / unichain |
| `name` | TEXT | event label |
| `created_at` | TIMESTAMPTZ | |

### `dataset_addresses` — deduplicated wallet set
| Column | Type | Notes |
|--------|------|-------|
| `address` | TEXT PK | lowercase |
| `updated_at` | TIMESTAMPTZ | last sync timestamp |

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_DUNE_API_KEY` | `.env.local` + Vercel | Dune API access |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Supabase anon key |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `.env.local` + Vercel | Admin panel password (sessionStorage-cached) |
| `NEXT_PUBLIC_POAP_API_KEY` | `.env.local` + Vercel | POAP API key (used server-side in /api/sync) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `.env.local` + Vercel | WalletConnect project ID |

## Blockscout chains

| Chain | Blockscout base URL |
|-------|-------------------|
| base | https://base.blockscout.com |
| optimism | https://optimism.blockscout.com |
| polygon | https://polygon.blockscout.com |
| ethereum | https://eth.blockscout.com |
| unichain | https://unichain.blockscout.com |

POAPs always use Gnosis chain (POAP protocol) but are fetched via POAP API, not Blockscout.

## Roadmap

- [x] Base Network leaderboard with activity scoring
- [x] 8-metric dashboard stats grid (live from Dune)
- [x] Wallet connect + top-30 eligibility check
- [x] User registration (name, email, X, Telegram, WhatsApp, country) via Supabase
- [x] /claim page — top-30 users see metrics card + submit OG NFT claim
- [x] ETH Cali branding favicon
- [x] Admin panel rebuilt as sidebar shell with 5 pages
- [x] Dataset sources manager — unified POAP/NFT table, chain logos, type + chain filters
- [x] Server-side dataset sync (POAP API + Blockscout, CORS-safe)
- [x] 17 POAP events + 16 NFT contracts seeded from event history CSV
- [x] Dataset browser — paginated address table, search, CSV export
- [x] Top-30 reconciliation page — rank × registered users × dataset, mailto claim button
- [ ] ERC-721 OG NFT contract on Base — mint to top 30 on-chain
- [ ] Merkle whitelist script — reads top 30 from Dune, updates contract allowlist
- [ ] Automate dataset sync on schedule (cron via Vercel or GitHub Actions)
- [ ] Expand leaderboard to Ethereum, Optimism, Arbitrum, Polygon
