'use client'

import { Navbar } from '../components/Navbar'

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="flex-grow w-full max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-12 pb-28 md:pb-10">

        {/* Title */}
        <section>
          <p className="font-label text-xs text-[#c7c5d4]/60 uppercase tracking-[0.3em] mb-2">// system_docs</p>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-[#e5e2e3] leading-none">
            HOW IT<br /><span className="text-[#c0c1ff]">WORKS</span>
          </h1>
        </section>

        {/* Score formula */}
        <section className="space-y-6">
          <div>
            <p className="font-label text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em] mb-2">// score_protocol</p>
            <h2 className="font-headline text-2xl font-bold text-[#e5e2e3] uppercase tracking-tight">Activity Score</h2>
            <p className="font-body text-sm text-[#908f9d] mt-2 leading-relaxed">
              Every wallet in the ETH Cali dataset gets an activity score based on their on-chain actions. The score is calculated the same way across all supported chains.
            </p>
          </div>

          {/* Formula display */}
          <div className="bg-[#1c1b1c] border border-[#c0c1ff]/15 p-6 font-mono text-sm text-[#e5e2e3]" style={{ boxShadow: '0 0 20px rgba(46,49,146,0.08)' }}>
            <p className="text-[#908f9d] text-xs mb-3">// score formula</p>
            <p>
              <span className="text-[#c0c1ff]">score</span>
              <span className="text-[#908f9d]"> = </span>
              <span className="text-[#e5e2e3]">(native_tx</span>
              <span className="text-[#c0c1ff]"> × 1</span>
              <span className="text-[#e5e2e3]">)</span>
              <span className="text-[#908f9d]"> + </span>
              <span className="text-[#e5e2e3]">(token_tx</span>
              <span className="text-[#c0c1ff]"> × 2</span>
              <span className="text-[#e5e2e3]">)</span>
              <span className="text-[#908f9d]"> + </span>
              <span className="text-[#e5e2e3]">(volume_usd</span>
              <span className="text-[#c0c1ff]"> / 100</span>
              <span className="text-[#e5e2e3]">)</span>
              <span className="text-[#908f9d]"> + </span>
              <span className="text-[#e5e2e3]">(contracts</span>
              <span className="text-[#c0c1ff]"> × 3</span>
              <span className="text-[#e5e2e3]">)</span>
            </p>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { pts: '1 pt', per: 'each', action: 'Native Transaction' },
              { pts: '2 pts', per: 'each', action: 'Token Transfer' },
              { pts: '1 pt', per: 'per $100', action: 'Token Volume' },
              { pts: '3 pts', per: 'each', action: 'Contract Deployed' },
            ].map(s => (
              <div key={s.action} className="bg-[#1c1b1c] border border-[#464652]/15 p-4 flex flex-col gap-1">
                <p className="font-headline text-2xl font-bold text-[#c0c1ff]">{s.pts}</p>
                <p className="font-label text-[9px] text-[#908f9d] uppercase tracking-widest">{s.per}</p>
                <p className="font-label text-[10px] text-[#908f9d] uppercase tracking-wider mt-1">{s.action}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Metric definitions */}
        <section className="space-y-4">
          <div>
            <p className="font-label text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em] mb-2">// metric_definitions</p>
            <h2 className="font-headline text-2xl font-bold text-[#e5e2e3] uppercase tracking-tight">What Each Metric Means</h2>
          </div>

          <div className="space-y-3">
            {[
              {
                col: 'Txns',
                full: 'Native Transactions',
                desc: 'Direct on-chain transactions using the chain\'s native token (ETH, MATIC, xDAI…). This includes sending tokens, calling contracts, and any other transaction that costs gas and is signed by your wallet.',
                example: 'Sending ETH to a friend, swapping on a DEX, deploying a contract.',
              },
              {
                col: 'Token Txns',
                full: 'Token Transfers (ERC-20)',
                desc: 'Transfer events emitted by ERC-20 token contracts. Each time a token moves between wallets — through a swap, transfer, or DeFi protocol — it generates one or more token transfer events.',
                example: 'Swapping USDC for ETH on Uniswap creates 2 token transfers. Bridging creates additional events.',
              },
              {
                col: 'Volume',
                full: 'Token Volume (USD)',
                desc: 'Total USD value of ERC-20 token transfers associated with your address. This includes both tokens sent and received, and covers stablecoins, wrapped assets, and DeFi tokens. Native ETH value is tracked separately through Txns.',
                example: 'Sending $500 USDC + receiving $490 WETH in a swap = ~$990 volume.',
              },
              {
                col: 'Contracts',
                full: 'Smart Contracts Deployed',
                desc: 'Number of smart contracts you have deployed on-chain. Deploying a contract is a strong signal of builder activity and contributes 3× more to your score than a standard transaction.',
                example: 'Deploying a token, an NFT contract, or a multisig all count as 1 contract each.',
              },
              {
                col: 'Score',
                full: 'Activity Score',
                desc: 'Composite score calculated from all four metrics using the formula above. Scores are accumulated across all chains when viewing the "All" tab. The top 30 scores on Base are eligible for the ETH Cali OG NFT.',
                example: '100 Txns + 50 Token Txns + $5,000 volume + 2 contracts = 100 + 100 + 50 + 6 = 256 pts',
              },
            ].map(m => (
              <div key={m.col} className="bg-[#1c1b1c] border border-[#464652]/15 p-5 flex flex-col gap-2 hover:bg-[#201f20] transition-colors group">
                <div className="flex items-baseline gap-3">
                  <span className="font-headline text-base font-bold text-[#c0c1ff] uppercase">{m.col}</span>
                  <span className="font-label text-[10px] text-[#908f9d] uppercase tracking-widest">{m.full}</span>
                </div>
                <p className="font-body text-sm text-[#908f9d] leading-relaxed">{m.desc}</p>
                <p className="font-label text-[10px] text-[#908f9d] uppercase tracking-wider pt-2 border-t border-[#464652]/15">
                  Example: {m.example}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Data source */}
        <section className="bg-[#1c1b1c] border border-[#464652]/15 p-6 space-y-3">
          <p className="font-label text-[10px] text-[#c0c1ff] uppercase tracking-[0.3em]">// data_source</p>
          <p className="font-body text-sm text-[#908f9d] leading-relaxed">
            All metrics are computed by <a href="https://dune.com/ethcali" target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">Dune Analytics</a> queries running over indexed on-chain data.
            The leaderboard is refreshed periodically. Data is all-time (from each wallet&apos;s first transaction to now).
          </p>
          <p className="font-body text-sm text-[#908f9d] leading-relaxed">
            The wallet dataset is built from holders of ETH Cali POAPs and NFTs — events, workshops, and activations organised by the <a href="https://ethcali.org" target="_blank" rel="noopener noreferrer" className="text-[#c0c1ff] hover:underline">ETH Cali</a> community in Colombia.
          </p>
          <div className="pt-3 border-t border-[#464652]/15 flex gap-4 flex-wrap font-label text-[10px] text-[#908f9d] uppercase tracking-widest">
            <span>Chains: Base · Ethereum · Optimism · Polygon · Gnosis · Unichain</span>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 font-label text-[10px] text-[#464652] uppercase tracking-widest pt-4 border-t border-[#464652]/15">
          <div className="flex gap-6">
            <a href="https://ethcali.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">ETH Cali</a>
            <a href="https://dune.com/ethcali" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Dune Analytics</a>
            <a href="https://warpcast.com/ethereumcali.eth" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Farcaster</a>
            <a href="https://twitter.com/ethcali_org" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0c1ff] transition-colors">Twitter</a>
          </div>
          <span>Node: Verified · Protocol: v2.0</span>
        </footer>
      </main>

    </>
  )
}
