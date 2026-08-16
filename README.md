# perseus-vault-dsh

Perseus Vault integration for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) — the open-source agent harness where everything is a plugin.

Two ways to connect the vault to a `dsh` agent:

| Mode | What it gives you | File |
|---|---|---|
| **MCP config row** (recommended start) | The vault's agent-safe tool surface as `mcp__perseus_vault__*` tools: `remember`, `recall`, `recall_when`, `semantic_search`, `context`, `capture`, `journal`, state, links, timelines — 48 tools, zero code | [`examples/dsh-mcp/perseus-vault.cordis.yml`](examples/dsh-mcp/perseus-vault.cordis.yml) |
| **Native plugin** | Automatic pre-step memory injection: relevant memories are pushed into the system prompt before every user turn (no "remember to call recall" needed) | [`packages/perseus-vault`](packages/perseus-vault) |

Both can be mounted together — the plugin handles injection, the MCP row gives the agent explicit memory tools.

## Quickstart (one command)

```sh
# 1. Install the Perseus Vault binary (pinned release)
cargo install perseus-vault@2.23.0   # or grab a release binary / Docker image

# 2. Add the bundle to a dsh profile — both the memory-injection plugin and
#    the MCP tool row are wired automatically (no hand-written config)
dsh plugin add -w @perseus-computing/dsh
```

(`-w` is required: a dsh profile is a pnpm workspace root, so pnpm's
add-to-root guard must be waived explicitly.)

The agent now gets automatic pre-step memory injection **plus** the
`mcp__perseus_vault__recall` / `remember` / `capture` tool surface. Adjust
`command` (vault binary path) and other options in the web UI under
**Settings → Plugins → Perseus Vault**, or with a `--patch` overlay that
replaces the bundle rows.

Prefer explicit config instead of the bundle? See
[examples/dsh-mcp/perseus-vault.cordis.yml](examples/dsh-mcp/perseus-vault.cordis.yml).

See [examples/dsh-mcp/README.md](examples/dsh-mcp/README.md) and [packages/perseus-vault/README.md](packages/perseus-vault/README.md) for details.

## What is Perseus Vault?

A persistent, encrypted, tamper-evident memory engine for AI agents (MIT). Durable facts with decay, bitemporal history, contradiction detection, workspace scoping, and an audit journal — one brain across projects and clients. [Perseus-Computing-LLC/perseus-vault](https://github.com/Perseus-Computing-LLC/perseus-vault)

## License

MIT — see [LICENSE](LICENSE).
