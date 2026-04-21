-- ETH Cali — Onchain Activity Score · Unichain
-- Dataset: dune.ethcali.dataset_users_onboarded_eth_cali
-- Score: native_txns×1 + token_txns×2 + volume_usd÷100 + contracts×3
-- Note: Check Dune availability — Unichain may require using raw tables only
-- Create at: https://dune.com/queries/create

WITH dataset AS (
  SELECT lower(address) AS address
  FROM dune.ethcali.dataset_users_onboarded_eth_cali
),

native_txns AS (
  SELECT
    t."from"          AS address,
    COUNT(*)          AS native_tx_count,
    MIN(t.block_time) AS first_tx_time,
    MAX(t.block_time) AS last_tx_time
  FROM unichain.transactions t
  INNER JOIN dataset d ON t."from" = d.address
  WHERE t.success = true
  GROUP BY 1
),

token_txns AS (
  SELECT
    tr."from"                                                AS address,
    COUNT(*)                                                 AS token_tx_count,
    COALESCE(SUM(
      tr.value / POWER(10, tk.decimals) * p.price
    ), 0)                                                    AS total_token_volume_usd
  FROM erc20_unichain.evt_Transfer tr
  LEFT JOIN tokens.erc20 tk
    ON tk.contract_address = tr.contract_address
    AND tk.blockchain = 'unichain'
  LEFT JOIN prices.usd p
    ON p.contract_address = tr.contract_address
    AND p.blockchain = 'unichain'
    AND p.minute = date_trunc('minute', tr.evt_block_time)
  INNER JOIN dataset d ON tr."from" = d.address
  GROUP BY 1
),

contracts AS (
  SELECT
    tr."from"  AS address,
    COUNT(*)   AS contracts_deployed
  FROM unichain.creation_traces tr
  INNER JOIN dataset d ON tr."from" = d.address
  GROUP BY 1
)

SELECT
  COALESCE(n.address, t.address, c.address)   AS address,
  COALESCE(n.native_tx_count, 0)              AS native_tx_count,
  COALESCE(t.token_tx_count, 0)              AS token_tx_count,
  COALESCE(t.total_token_volume_usd, 0)      AS total_token_volume_usd,
  COALESCE(c.contracts_deployed, 0)          AS contracts_deployed,
  COALESCE(n.native_tx_count, 0) * 1
    + COALESCE(t.token_tx_count, 0) * 2
    + COALESCE(t.total_token_volume_usd, 0) / 100.0
    + COALESCE(c.contracts_deployed, 0) * 3  AS activity_score,
  n.first_tx_time,
  n.last_tx_time
FROM native_txns n
FULL OUTER JOIN token_txns t ON n.address = t.address
FULL OUTER JOIN contracts c ON COALESCE(n.address, t.address) = c.address
WHERE COALESCE(n.native_tx_count, 0)
    + COALESCE(t.token_tx_count, 0)
    + COALESCE(c.contracts_deployed, 0) > 0
ORDER BY activity_score DESC
