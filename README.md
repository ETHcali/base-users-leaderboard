# ETH Cali — Base Users Leaderboard

Onchain activity leaderboard for wallets onboarded by [ETH Cali](https://ethcali.org), a Colombian Web3 education community building the next generation of Latin American builders.

**Live site:** https://web-5dwc86s2h-ekinoxis-team.vercel.app

![ETH Cali](./public/branding/LogoETHCALI%20Horizontal%20-%20Fondo%20Blaco.png)

## What it does

- Displays a ranked leaderboard of all ETH Cali onboarded wallets active on **Base Network**
- Scores each wallet based on onchain activity (transactions, token volume, contract deployments)
- Connect your wallet to see your rank and check eligibility for the **ETH Cali OG NFT** (top 30)

## Score formula

| Action | Points |
|--------|--------|
| Native transaction | 1 pt each |
| Token transfer | 2 pts each |
| $100 token volume | 1 pt |
| Contract deployed | 3 pts each |

Data source: [Dune Analytics](https://dune.com/ethcali) · Chain: Base · Timeframe: All-time since Aug 2023

## Tech stack

- [Next.js 16](https://nextjs.org) + [Tailwind CSS 4](https://tailwindcss.com)
- [wagmi v2](https://wagmi.sh) + [RainbowKit v2](https://www.rainbowkit.com) — wallet connect
- [Dune Analytics API](https://dune.com/docs/api) — onchain data
- [Vercel](https://vercel.com) — hosting

## Local development

```bash
npm install
cp .env.example .env.local   # add your NEXT_PUBLIC_DUNE_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```bash
NEXT_PUBLIC_DUNE_API_KEY=your_dune_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

Get a free WalletConnect project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

## Roadmap

- [x] Base Network leaderboard with activity scoring
- [x] Wallet connect + top 30 eligibility check
- [ ] User registration — identify yourself to claim benefits
- [ ] ETH Cali OG NFT claim for top 30 wallets
- [ ] Multi-chain leaderboard (Ethereum, Optimism, Arbitrum, Polygon)

## Links

- [ETH Cali](https://ethcali.org)
- [Farcaster](https://warpcast.com/ethereumcali.eth)
- [Twitter](https://twitter.com/ethcali_org)
- [GitHub](https://github.com/ethcali)
- [Dune Dashboard](https://dune.com/ethcali/onchain-metrics-by-users-onboarded-by-ethcali)
