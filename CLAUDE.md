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
| `app/page.tsx` | Main leaderboard page — all UI, Dune fetch, wallet check |
| `app/providers.tsx` | WagmiProvider + RainbowKitProvider + QueryClientProvider |
| `app/layout.tsx` | Root layout, metadata, dark theme |
| `.env.local` | `NEXT_PUBLIC_DUNE_API_KEY` (not committed) |
| `public/branding/` | ETH Cali logos and assets |
| `docsdune/` | Reference docs: Dune CLI, MCP, and query patterns |

## Dune data

- **Dataset**: `dune.ethcali.dataset_users_onboarded_eth_cali` — wallet addresses onboarded by ETH Cali (from NFT holders + POAP events, manually maintained)
- **Main query**: [6634911](https://dune.com/queries/6634911) — Base Network activity per wallet
- **Chain**: Base (all-time since Aug 2023 launch)

### Score formula (query 6634911)

```
score = (native_tx_count × 1) + (token_tx_count × 2) + (total_token_volume_usd / 100) + (contracts_deployed × 3)
```

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_DUNE_API_KEY` | `.env.local` + Vercel | Dune API access |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `.env.local` + Vercel | WalletConnect (get free key at cloud.walletconnect.com) |

## Reference docs (docsdune/)

- `dunecliskills.md` — Dune CLI commands and patterns
- `dunemcp.md` — Dune MCP server tools
- `dunempp.md` — Dune query/dashboard management

## Roadmap

- [ ] Add WalletConnect project ID for production wallet support
- [ ] User registration DB — wallets identify themselves (name, email, socials) to claim benefits
- [ ] ERC-721 NFT contract on Base — top 30 wallets can claim OG NFT
- [ ] Merkle whitelist script — reads top 30 from Dune API, updates contract root
- [ ] Expand leaderboard to Ethereum, Optimism, Arbitrum, Polygon
- [ ] Automate dataset sync from POAP API + NFT holders
