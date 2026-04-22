> ## Documentation Index
> Fetch the complete documentation index at: https://docs.etherscan.io/llms.txt
> Use this file to discover all available pages before exploring further.

# ELI5 to MCP

Etherscan's MCP [(Model Context Protocol)](https://modelcontextprotocol.io) allows you to connect Etherscan and [60+ supported chain](/supported-chains) data to your AI models such as ChatGPT, Claude.

An ELI5, the MCP standard provides a list of tools that your model can call to lookup information via the Etherscan API. Yes, it is an API wrapper. This avoids common problem of LLMs making things up (hallucination) or getting blocked by captcha on a web search.

Some use cases of our beta users

* Comparing Solidity code with actual contracts deployed on chain
* Customer support for bridge transactions, if the transactions has arrived
* Portfolio management agents

## Connect

<Tabs>
  <Tab title="General">
    We host a Streamable HTTP MCP server at

    ```
    https://mcp.etherscan.io/mcp
    ```

    You will need to authenticate using your Etherscan API key, as a bearer token in the header like

    ```
    Authorization: Bearer YourEtherscanApiKey
    ```
  </Tab>

  <Tab title="Codex">
    This guide is for [Codex](https://developers.openai.com/codex/quickstart) as an extension within VS Code.

    <Steps>
      <Step title="MCP Settings">
        Open the MCP settings from ⚙️ > MCP settings

        <img src="https://mintcdn.com/etherscan/FJ7GkrsyczwoBPf-/images/settings.png?fit=max&auto=format&n=FJ7GkrsyczwoBPf-&q=85&s=2cab2bf4aeba18f0bda9c053f9946889" alt="Codex settings" title="" width="1847" height="757" data-path="images/settings.png" />
      </Step>

      <Step title="Add Server">
        Click on Add Server, and the following details.

        Name: Etherscan MCP

        Server Type: Streamable HTTP

        URL: [https://mcp.etherscan.io/mcp](https://mcp.etherscan.io/mcp)

        Bearer token env var: Your Etherscan API Key (access to endpoints follow your usage tier)
      </Step>

      <Step title="Save">
        Save and you'll see a Custom server entry.
      </Step>
    </Steps>
  </Tab>
</Tabs>
