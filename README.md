# ETH Cali — Multi-Chain Activity Leaderboard

Onchain activity leaderboard for wallets onboarded by [ETH Cali](https://ethcali.org), a Colombian Web3 education community building the next generation of Latin American builders.

**Live:** https://web-5dwc86s2h-ekinoxis-team.vercel.app  
**Dune Dashboard:** https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali  
**Repo:** https://github.com/ETHcali/base-users-leaderboard

---

## What it does

### Leaderboard (`/`)
- Chain tabs: **Base · Ethereum · Optimism · Polygon · Gnosis · Unichain**
- Sortable ranked table — click any column (Txns, Token Txns, Volume, Contracts, Score)
- Connect wallet to see your rank and top-30 eligibility
- Register your profile directly from the leaderboard

### Sources (`/sources`)
- Browse all POAP events and NFT contracts that make up the ETH Cali wallet dataset
- Filter by type (POAP / NFT) and by chain
- Shows event date, holder count, and explorer links

### About (`/about`)
- Score formula explained
- Definition of each metric: Txns, Token Txns, Volume, Contracts

### Profile (`/profile`)
- Connect your wallet to see your on-chain metrics across all 6 chains
- View your registration data (name, email, X, Telegram, etc.)
- **Base top 30 wallets:** inline OG NFT claim with tactical ID card, score breakdown, and claim submission

### Admin panel (`/admin`)
Password-protected, sidebar navigation:

| Page | Description |
|------|-------------|
| **Dashboard** | Dataset KPIs + per-chain Dune stats (wallets, top score, total txns, total volume). One-click sync. |
| **Sources** | Unified POAP/NFT table — add, edit, remove sources, trigger per-row sync |
| **Dataset** | Browse all unique wallet addresses, search, export CSV for Dune upload |
| **Users** | Registered users enriched with Dune rank + score. Filter to top 30. Export CSV. |
| **Top 30** | Reconciliation screen: Dune top 30 × registered users × dataset. Status per wallet. |

---

## Score formula

| Action | Points |
|--------|--------|
| Native transaction | 1 pt each |
| ERC-20 token transfer | 2 pts each |
| $100 token volume | 1 pt |
| Smart contract deployed | 3 pts each |

Same formula applied across all 6 chains. Data: Dune Analytics · All-time.

---

## Dune queries

| Chain | Query |
|-------|-------|
| Base | [6634911](https://dune.com/queries/6634911) |
| Ethereum | [7347012](https://dune.com/queries/7347012) |
| Optimism | [7346993](https://dune.com/queries/7346993) |
| Polygon | [7346995](https://dune.com/queries/7346995) |
| Gnosis | [7346996](https://dune.com/queries/7346996) |
| Unichain | [7346997](https://dune.com/queries/7346997) |

SQL templates: `docsdune/queries/{chain}.sql`

---

## Dataset sync

The wallet dataset is built from ETH Cali event history:
- **POAP events** fetched via POAP API (`api.poap.tech`)
- **NFT contracts** (Unlock Protocol and others) fetched via Blockscout REST API across Base, Optimism, Polygon, Ethereum, and Unichain

Sync runs server-side (`POST /api/sync`) to avoid CORS. Results stored in Supabase `dataset_addresses` and exported as CSV for Dune upload.

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
NEXT_PUBLIC_DUNE_API_KEY=
NEXT_PUBLIC_DUNE_QUERY_ID_BASE=6634911
NEXT_PUBLIC_DUNE_QUERY_ID_ETHEREUM=7347012
NEXT_PUBLIC_DUNE_QUERY_ID_OPTIMISM=7346993
NEXT_PUBLIC_DUNE_QUERY_ID_POLYGON=7346995
NEXT_PUBLIC_DUNE_QUERY_ID_GNOSIS=7346996
NEXT_PUBLIC_DUNE_QUERY_ID_UNICHAIN=7346997
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ADMIN_PASSWORD=
NEXT_PUBLIC_POAP_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
ETHERSCAN_API_KEY=                     # fallback when Blockscout fails
```

---

## Roadmap

- [x] Multi-chain leaderboard — 6 chains, sortable table
- [x] Shared navbar component — active state auto-detected by route
- [x] `/sources` — public source browser with chain + type filters
- [x] `/about` — score formula + metric explanations
- [x] `/profile` — per-chain metrics + inline OG NFT claim for Base top 30
- [x] Admin panel — dashboard, sources, dataset, users, top30
- [x] Server-side dataset sync (POAP + Blockscout)
- [x] User registration via Supabase
- [ ] ERC-721 OG NFT contract on Base — on-chain mint for top 30
- [ ] Merkle whitelist script — reads top 30 from Dune, updates contract allowlist
- [ ] Automate dataset sync (Vercel cron / GitHub Actions)

---

## Links

- [ETH Cali](https://ethcali.org)
- [Farcaster](https://warpcast.com/ethereumcali.eth)
- [Twitter / X](https://twitter.com/ethcali_org)
- [GitHub](https://github.com/ethcali)
- [Dune Dashboard](https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali)
