@AGENTS.md

# ETH Cali — Base Users Leaderboard

## Project overview

Onchain activity leaderboard for wallets onboarded by [ETH Cali](https://ethcali.org), a Colombian Web3 education community. Users connect their wallet to see their rank and check eligibility for the ETH Cali OG NFT (top 30).

Live: https://web-5dwc86s2h-ekinoxis-team.vercel.app  
Repo: https://github.com/ETHcali/base-users-leaderboard  
Dashboard: https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS 4**
- **wagmi v2** + **RainbowKit v2** — wallet connect (any wallet, Base network)
- **Dune Analytics API** — leaderboard data (query 6634911)
- **Vercel** — hosting, auto-deploy on push to `main`

> ⚠️ RainbowKit 2 requires wagmi v2 (`^2.9.0`). Do NOT upgrade wagmi to v3 — it breaks the peer dependency.

## Key files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main leaderboard — Dune fetch, wallet check, 8-metric stats grid, registration flow |
| `app/claim/page.tsx` | Claim page — top-30 verification, onchain metrics card, OG NFT claim submit |
| `app/admin/page.tsx` | Password-protected admin — all registered users with Dune data enrichment |
| `app/components/RegisterModal.tsx` | Registration modal — name, email, socials, country, WhatsApp |
| `app/providers.tsx` | WagmiProvider + RainbowKitProvider + QueryClientProvider |
| `app/layout.tsx` | Root layout, metadata, favicon (ETH Cali branding PNG) |
| `lib/supabase.ts` | Supabase client + UserProfile type |
| `.env.local` | `NEXT_PUBLIC_DUNE_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL/KEY`, `NEXT_PUBLIC_ADMIN_PASSWORD` |
| `public/branding/` | ETH Cali logos — used as favicon and in claim page hero |
| `docsdune/` | Reference docs: Dune CLI, MCP, and query patterns |

## Dune data

- **Dataset**: `dune.ethcali.dataset_users_onboarded_eth_cali` — wallet addresses onboarded by ETH Cali (from NFT holders + POAP events, manually maintained)
- **Main query**: [6634911](https://dune.com/queries/6634911) — Base Network activity per wallet
- **Chain**: Base (all-time since Aug 2023 launch)

### Score formula (query 6634911)

```
score = (native_tx_count × 1) + (token_tx_count × 2) + (total_token_volume_usd / 100) + (contracts_deployed × 3)
```

## Reference docs (docsdune/)

- `dunecliskills.md` — Dune CLI commands and patterns
- `dunemcp.md` — Dune MCP server tools
- `dunempp.md` — Dune query/dashboard management

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_DUNE_API_KEY` | `.env.local` + Vercel | Dune API access |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Supabase anon key |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `.env.local` + Vercel | Admin panel password |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `.env.local` + Vercel | WalletConnect (get free key at cloud.walletconnect.com) |

## Supabase schema

Table `users`:
- `wallet_address` TEXT PRIMARY KEY (lowercase)
- `name` TEXT NOT NULL
- `email` TEXT
- `x_username` TEXT
- `telegram_handle` TEXT
- `whatsapp` TEXT
- `country_code` TEXT
- `registered_at` TIMESTAMPTZ

## Roadmap

- [x] Base Network leaderboard with activity scoring
- [x] 8-metric dashboard stats grid (live from Dune)
- [x] User registration (name, email, socials, country) via Supabase
- [x] Admin panel with Dune-enriched user table
- [x] /claim page — verified top-30 users see metrics + OG NFT claim flow
- [x] ETH Cali branding favicon
- [ ] ERC-721 NFT contract on Base — mint OG NFT to top 30 on-chain
- [ ] Merkle whitelist script — reads top 30 from Dune API, updates contract root
- [ ] Expand leaderboard to Ethereum, Optimism, Arbitrum, Polygon
- [ ] Automate dataset sync from POAP API + NFT holders
