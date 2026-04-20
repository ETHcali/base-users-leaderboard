> ## Documentation Index
> Fetch the complete documentation index at: https://docs.dune.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Dune CLI & Skills

> Give your AI coding agent direct access to Dune's blockchain data through the Dune CLI and Agent Skills.

The Dune CLI and Agent Skills give your AI coding agent structured access to Dune's datasets, query engine, visualizations, and dashboards -- directly inside the tools you already use.

The **Dune CLI** is a terminal-native interface for discovering datasets, executing DuneSQL queries, managing visualizations, and building dashboards. **Dune Skills** are portable instruction packages that teach AI agents how to use the CLI effectively -- from writing correct SQL to handling errors and optimizing costs.

Together, they turn any skills-compatible agent into a blockchain data analyst that can go from prompt to published dashboard.

<video autoPlay muted loop playsInline className="w-full aspect-video rounded-xl" src="https://mintcdn.com/dune/5d5kkqdTBLT9ST4X/videos/cli_demo.mp4?fit=max&auto=format&n=5d5kkqdTBLT9ST4X&q=85&s=a71a59403b67f7f40f89ed979b9391b8" data-path="videos/cli_demo.mp4" />

## Dune CLI

The Dune CLI lets you query, explore, and manage blockchain data without leaving your terminal. All commands support both human-readable and JSON output, making them equally useful for interactive work and agent-driven workflows.

### Install

```bash theme={null}
curl -sSfL https://dune.com/cli/install.sh | sh
```

The install script handles everything you need to get started: it installs the Dune CLI, runs `dune auth` to configure your API key, and installs the Dune Agent Skill via `npx skills add`. In most cases, this single command is all you need.

<Note>
  You'll need a Dune API key during setup. Generate one at [dune.com](https://dune.com) under **APIs and Connectors > API Keys** before running the install script.
</Note>

### Authenticate (manual)

If you need to re-authenticate or configure a different API key after installation, you can run:

```bash theme={null}
dune auth
```

You'll be prompted to enter your API key. It's saved to `~/.config/dune/config.yaml` for future sessions.

Alternatively, pass the key inline or via environment variable:

```bash theme={null}
# Environment variable
export DUNE_API_KEY=<your-api-key>

# Inline flag
dune query run 12345 --api-key <your-api-key>
```

### Usage

Run `dune --help` to see all available commands. All commands support `-o json` for structured, machine-parseable output -- ideal for agent consumption:

```bash theme={null}
dune query run-sql --sql "SELECT * FROM ethereum.transactions LIMIT 5" -o json
```

***

## Dune Skills

[Agent Skills](https://agentskills.io) are an open standard for giving AI agents new capabilities. The Dune Skill teaches your agent how to use the Dune CLI to discover datasets, write DuneSQL, execute queries, handle errors, and manage costs -- all from natural language prompts.

Skills are supported by Claude Code, Cursor, OpenCode, OpenAI Codex, VS Code, Gemini CLI, Goose, and [many more](https://agentskills.io).

<Card title="Dune Skills GitHub Repository" icon="github" href="https://github.com/duneanalytics/skills">
  Source code, skill definitions, and documentation for Dune Agent Skills. Includes the `dune` skill for CLI-based blockchain data queries and the `sim` skill for real-time wallet and token lookups.
</Card>

### Install

The Dune Skill is automatically installed when you run the [CLI install script](#install) above -- no extra steps required.

If you need to install or reinstall the skill separately, you can run:

```bash theme={null}
npx skills add duneanalytics/skills
```

<Tabs>
  <Tab title="Claude Code">
    Skills are automatically installed to `~/.claude/skills/` and loaded when your conversation matches blockchain-related triggers.
  </Tab>

  <Tab title="Cursor">
    You can also add the skill via **Settings > Rules > Add Rule > Remote Rule (Github)** with `duneanalytics/skills`.
  </Tab>

  <Tab title="Manual">
    Clone the [duneanalytics/skills](https://github.com/duneanalytics/skills) repository and copy the `skills/dune/` folder into your agent's skill directory:

    | Agent        | Directory                    |
    | ------------ | ---------------------------- |
    | Claude Code  | `~/.claude/skills/`          |
    | Cursor       | `~/.cursor/skills/`          |
    | OpenCode     | `~/.config/opencode/skills/` |
    | OpenAI Codex | `~/.codex/skills/`           |
  </Tab>
</Tabs>

### How it works

Once installed, the Dune Skill activates automatically when your conversation involves blockchain data, on-chain analytics, DuneSQL, token transfers, DEX trades, smart contract events, or wallet analysis. The agent then:

1. Discovers the right tables using `dune dataset search`
2. Inspects column schemas to build correct SQL
3. Writes DuneSQL with proper partition filters for cost efficiency
4. Executes the query and parses results
5. Generates and manages visualizations (charts, counters, tables)
6. Creates and updates dashboards from query results
7. Handles errors with built-in recovery strategies

The skill includes detailed reference documents for query execution, dataset discovery, DuneSQL syntax, and error handling -- loaded on demand to keep context window usage efficient.

***

## Key Benefits

<CardGroup cols={3}>
  <Card title="Agent-Native Data Access" icon="robot">
    Your AI agent queries blockchain data directly -- no context switching, no copy-pasting SQL between apps.
  </Card>

  <Card title="Works Where You Work" icon="toolbox">
    Compatible with Claude Code, Cursor, VS Code, Codex, and any agent that supports the Agent Skills standard.
  </Card>

  <Card title="Cost-Aware by Default" icon="coins">
    The skill teaches agents to filter on partition columns and choose the right performance tier, reducing credit consumption.
  </Card>
</CardGroup>

## Use Cases

<CardGroup cols={2}>
  <Card title="Ad-Hoc Analysis" icon="magnifying-glass-chart">
    Ask your agent a question in plain English and get results backed by DuneSQL -- from DEX volumes to gas trends.
  </Card>

  <Card title="Contract Exploration" icon="file-contract">
    Give the agent a contract address and let it discover all decoded event and call tables automatically.
  </Card>

  <Card title="Pipeline Scripting" icon="code">
    Use the CLI's JSON output and async execution to integrate Dune queries into CI/CD pipelines or monitoring scripts.
  </Card>

  <Card title="Reusable Parameterized Queries" icon="arrows-spin">
    Create saved queries with parameters, then run them with different inputs across sessions.
  </Card>
</CardGroup>
