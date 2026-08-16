# perseus-vault-dsh

Perseus Vault integration for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) — the open-source agent harness where everything is a plugin.

Two ways to connect the vault to a `dsh` agent:

| Mode | What it gives you | File |
|---|---|---|
| **MCP config row** (recommended start) | The vault's agent-safe tool surface as `mcp__perseus_vault__*` tools: `remember`, `recall`, `recall_when`, `semantic_search`, `context`, `capture`, `journal`, state, links, timelines — 48 tools, zero code | [`examples/dsh-mcp/perseus-vault.cordis.yml`](examples/dsh-mcp/perseus-vault.cordis.yml) |
| **Native plugin** | Automatic pre-step memory injection: relevant memories are pushed into the system prompt before every user turn (no "remember to call recall" needed) | [`packages/perseus-vault`](packages/perseus-vault) |

Both can be mounted together — the plugin handles injection, the MCP row gives the agent explicit memory tools.

## Quickstart

```sh
# 1. Install the Perseus Vault binary (pinned release)
cargo install perseus-vault@2.23.0   # or grab a release binary / Docker image

# 2. Run dsh with the MCP overlay
npx @deepseek-ai/dsh web --patch "$PWD/examples/dsh-mcp/perseus-vault.cordis.yml"
```

The agent now sees `mcp__perseus_vault__recall`, `mcp__perseus_vault__remember`, etc. For automatic injection, also mount the plugin:

```yaml
- insert:
    - id: perseus-vault-memory
      name: '@perseus-computing/dsh'   # or a local path while testing
      config:
        command: perseus-vault
```

See [examples/dsh-mcp/README.md](examples/dsh-mcp/README.md) and [packages/perseus-vault/README.md](packages/perseus-vault/README.md) for details.

## What is Perseus Vault?

A persistent, encrypted, tamper-evident memory engine for AI agents (MIT). Durable facts with decay, bitemporal history, contradiction detection, workspace scoping, and an audit journal — one brain across projects and clients. [Perseus-Computing-LLC/perseus-vault](https://github.com/Perseus-Computing-LLC/perseus-vault)

## License

MIT — see [LICENSE](LICENSE).
