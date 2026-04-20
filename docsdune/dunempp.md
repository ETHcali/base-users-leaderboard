> ## Documentation Index
> Fetch the complete documentation index at: https://docs.dune.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Dune MPP

> Access Dune's API with pay-per-request micropayments using the Machine Payment Protocol.

MPP (Machine Payment Protocol) is an open standard for machine-to-machine HTTP micropayments built on the [HTTP 402 challenge-response flow](https://paymentauth.org/draft-httpauth-payment-00.txt). Dune's MPP integration lets agents pay per-request through a payment channel - no API keys, no user account, and no credit card required.

## How It Works

1. Your client sends a request to a Dune API endpoint.
2. Dune responds with **HTTP 402** and a `WWW-Authenticate: Payment` challenge describing the cost.
3. The `mppx` client library automatically opens a **Tempo payment channel** on the first 402, depositing funds into an on-chain escrow.
4. Subsequent requests are authenticated with signed channel vouchers deducted from the deposit.
5. When you are done, you **close the session** and any unspent deposit is returned to your wallet.

## Available Endpoints

| Endpoint                                  | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `POST /v1/sql/execute`                    | Execute a SQL query                   |
| `GET /v1/execution/:execution_id/results` | Fetch JSON results for an execution   |
| `GET /v1/execution/:execution_id/csv`     | Download CSV results for an execution |

***

## Option 1: Agentic Integration

The fastest way to get started. Ask your AI coding agent to set up Tempo and run a query on Dune - no manual code required. This works with any agent that supports skills or tool use, including Claude Code, Cursor, OpenAI Codex, OpenCode, and others.

### Getting Started

Simply give your agent the following prompt:

```
Read https://tempo.xyz/SKILL.md and set up tempo.
After that, use MPP to run the following query on Dune:

SELECT * FROM ethereum.transactions LIMIT 10
```

Your agent will:

1. Read the Tempo skill instructions and configure itself
2. Open a payment channel funded from your crypto wallet
3. Execute the query against Dune's API via MPP
4. Return the results directly in your conversation

No Dune account, no API key, and no credit card needed - you pay per-request with crypto.

### Closing Your Session

<Warning>
  Always ask your agent to **close the session** when you are done. Closing the session settles the payment channel on-chain and refunds any reserved funds back to your wallet - you are only charged for what you actually used.
</Warning>

When you are finished querying, tell your agent:

```
Close the tempo session.
```

This ensures your unspent deposit is returned promptly. If you forget to close, funds remain in escrow until the channel expires.

***

## Option 2: Manual Integration

For full control, you can integrate MPP directly into your application using the [`mppx`](https://github.com/wevm/mppx) client library and [`viem`](https://viem.sh) for EVM account management. The `mppx` session API wraps the standard `fetch` and handles the 402 negotiation, channel management, spend tracking, and payment signing transparently.

### Step 1 - Install dependencies

```bash theme={null}
npm install mppx viem
```

### Step 2 - Set up your wallet and initialize a session

Create an account from a private key and initialize a Tempo session. The `maxDeposit` parameter sets the maximum amount (in USD) to escrow when a payment channel is opened.

```typescript theme={null}
import { tempo } from "mppx/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(
  process.env.PRIVATE_KEY as `0x${string}`
);
const session = tempo.session({ account, maxDeposit: "10" });
```

### Step 3 - Execute a query

Use `session.fetch` exactly like the standard Fetch API. On the first call, the session intercepts the 402 response, opens a Tempo payment channel, and retries the request with a valid payment credential - all transparently.

```typescript theme={null}
const execRes = await session.fetch("https://api.dune.com/api/v1/sql/execute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sql: "SELECT * FROM ethereum.transactions LIMIT 10" }),
});
const { execution_id } = (await execRes.json()) as { execution_id: string };
```

### Step 4 - Poll until the query completes

Dune executes queries asynchronously. Poll the status endpoint until the state is `QUERY_STATE_COMPLETED`.

```typescript theme={null}
let state = "";
do {
  const r = await session.fetch(
    `https://api.dune.com/api/v1/execution/${execution_id}/status`
  );
  state = ((await r.json()) as { state: string }).state;
  if (state === "QUERY_STATE_FAILED") throw new Error("Query failed");
  if (state !== "QUERY_STATE_COMPLETED")
    await new Promise((r) => setTimeout(r, 2_000));
} while (state !== "QUERY_STATE_COMPLETED");
```

### Step 5 - Fetch results

Once the query completes, retrieve the results. Each request is automatically paid through the open channel.

```typescript theme={null}
const resultsRes = await session.fetch(
  `https://api.dune.com/api/v1/execution/${execution_id}/results`
);
console.log(await resultsRes.json());
```

### Step 6 - Close the session

When you are finished, close the session to settle on-chain and reclaim any unspent deposit. You are only charged for what you used.

```typescript theme={null}
await session.close();
```

***

## Learn More

* [`mppx` client library](https://github.com/wevm/mppx) - TypeScript SDK for MPP
* [paymentauth.org](https://paymentauth.org/) - protocol specifications and registry
* [Dune API Reference](/api-reference/overview/introduction) - full list of available API endpoints
