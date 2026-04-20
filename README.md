# ETH Cali — Base Users Leaderboard

Onchain activity leaderboard for wallets onboarded by [ETH Cali](https://ethcali.org), a Colombian Web3 education community building the next generation of Latin American builders.

**Live:** https://web-5dwc86s2h-ekinoxis-team.vercel.app  
**Dune Dashboard:** https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali  
**Repo:** https://github.com/ETHcali/base-users-leaderboard

![ETH Cali](./public/branding/LogoETHCALI%20Horizontal%20-%20Fondo%20Blaco.png)

---

## What it does

### Public leaderboard (`/`)
- Ranked table of all ETH Cali onboarded wallets active on **Base Network**
- 8 live aggregate metrics: native txns, ERC-20 txns, token volume, contracts deployed, top score, avg score, power users, top-30 cutoff
- Connect your wallet to see your rank, score breakdown, and top-30 eligibility
- Progress bar showing how far you are from the top 30

### Claim flow (`/claim`)
- Top-30 wallets see their full onchain profile card with score breakdown
- Register name, email, X, Telegram, WhatsApp, country
- Submit OG NFT claim — notifies the ETH Cali team for manual mint

### Admin panel (`/admin`)
Password-protected, sidebar navigation with 5 pages:

| Page | Description |
|------|-------------|
| **Dashboard** | KPI cards: POAP sources, NFT contracts, unique addresses, registered users, top-30 registered. One-click sync. |
| **Sources** | Unified table of all 17 POAP events + 16 NFT contracts with chain logos. Filter by type (POAP/NFT) and chain. Add or remove sources. |
| **Dataset** | Browse all unique wallet addresses (paginated). Search by prefix. Export CSV for Dune upload. |
| **Users** | All registered users enriched with Dune rank + score. Filter to top 30. Export CSV. |
| **Top 30** | Reconciliation screen: Dune top 30 joined with registered users and dataset. Status per wallet (Registered / In dataset / Unknown). Mailto claim button. |

---

## Score formula

| Action | Points |
|--------|--------|
| Native ETH transaction | 1 pt each |
| ERC-20 token transfer | 2 pts each |
| $100 token volume | 1 pt |
| Smart contract deployed | 3 pts each |

Data: [Dune Analytics query 6634911](https://dune.com/queries/6634911) · Chain: Base · All-time since Aug 2023

---

## Dataset sync

The wallet dataset is built from ETH Cali event history:
- **17 POAP events** fetched via POAP API (`api.poap.tech`)
- **16 Unlock Protocol NFT contracts** across Base, Optimism, and Polygon fetched via Blockscout REST API

Sync runs server-side (`POST /api/sync`) to avoid CORS. Results are stored in Supabase `dataset_addresses` and exported as CSV for Dune upload.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) App Router |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Wallet | [wagmi v2](https://wagmi.sh) + [RainbowKit v2](https://www.rainbowkit.com) |
| Onchain data | [Dune Analytics API](https://dune.com/docs/api) |
| Database | [Supabase](https://supabase.com) (Postgres) |
| NFT holders | [Blockscout REST API](https://docs.blockscout.com) |
| POAP holders | [POAP API](https://documentation.poap.tech) |
| Hosting | [Vercel](https://vercel.com) — auto-deploy on push to `main` |

> ⚠️ RainbowKit 2 requires wagmi v2 (`^2.9.0`). Do NOT upgrade wagmi to v3.

---

## Local development

```bash
npm install
cp .env.example .env.local  # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### CLI dataset sync

```bash
NEXT_PUBLIC_POAP_API_KEY=xxx node scripts/sync-dataset.mjs
```

Outputs `public/dataset.csv` — upload to Dune to refresh the leaderboard dataset.

---

## Environment variables

```bash
NEXT_PUBLIC_DUNE_API_KEY=               # Dune API key
NEXT_PUBLIC_SUPABASE_URL=               # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # Supabase anon key
NEXT_PUBLIC_ADMIN_PASSWORD=             # Admin panel password
NEXT_PUBLIC_POAP_API_KEY=               # POAP API key (server-side sync)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # WalletConnect (cloud.walletconnect.com)
```

---

## Roadmap

- [x] Base Network leaderboard with activity scoring
- [x] 8-metric live dashboard stats grid
- [x] Wallet connect + top-30 eligibility check
- [x] User registration via Supabase (name, email, X, Telegram, WhatsApp, country)
- [x] `/claim` page — top-30 metrics card + OG NFT claim submit
- [x] ETH Cali branding favicon
- [x] Admin panel — sidebar shell with 5 focused pages
- [x] Sources manager — unified POAP/NFT table, chain logos, type + chain filters
- [x] Server-side dataset sync (POAP API + Blockscout, CORS-safe)
- [x] 17 POAP events + 16 NFT contracts seeded from event history
- [x] Dataset browser — paginated, searchable, CSV export
- [x] Top-30 reconciliation — rank × users × dataset, mailto claim
- [ ] ERC-721 OG NFT contract on Base — mint to top 30 on-chain
- [ ] Merkle whitelist script — reads top 30 from Dune, updates contract allowlist
- [ ] Automate dataset sync on schedule (Vercel cron / GitHub Actions)
- [ ] Expand leaderboard to Ethereum, Optimism, Arbitrum, Polygon

---

## Links

- [ETH Cali](https://ethcali.org)
- [Farcaster](https://warpcast.com/ethereumcali.eth)
- [Twitter / X](https://twitter.com/ethcali_org)
- [GitHub](https://github.com/ethcali)
- [Dune Dashboard](https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali)
