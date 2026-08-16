# Perseus Vault MCP example

A **default-off reference configuration** connecting [Perseus Vault](https://github.com/Perseus-Computing-LLC/perseus-vault) to DSH through [`@deepseek-ai/dsh-mcp-client`](../../packages/mcp/mcp-client/README.md). Perseus Vault is a persistent, encrypted, tamper-evident memory engine for AI agents: durable facts with decay and bitemporal history, contradiction detection, workspace scoping, and an audit journal.

This configuration is provided as an interoperability example only. Its inclusion does not imply endorsement, recommendation, partnership, or ongoing support by DeepSeek.

## What DSH does

DSH parses the selected Cordis overlay, starts the configured stdio command (or connects to a configured Streamable HTTP URL), discovers MCP tools, and exposes them as `mcp__perseus_vault__<tool>`. DSH does **not** download the server, initialize its database, or supervise a separate HTTP service (that variant uses the `streamable-http` row instead).

## Prerequisites

| System | Tested pin | Transport | Upstream prerequisite |
|---|---:|---|---|
| [Perseus Vault](https://github.com/Perseus-Computing-LLC/perseus-vault) | `perseus-vault@2.23.0` | stdio (this file) or `streamable-http` (sibling file) | `cargo install perseus-vault@2.23.0`, or a pinned release binary / Docker image |

## Enable

```sh
dsh web --patch "$PWD/examples/dsh-mcp/perseus-vault.cordis.yml"
```

The agent sees `mcp__perseus_vault__remember`, `mcp__perseus_vault__recall`, `mcp__perseus_vault__recall_when`, `mcp__perseus_vault__context`, `mcp__perseus_vault__capture`, `mcp__perseus_vault__semantic_search`, `mcp__perseus_vault__journal`, and the rest of the agent-tier surface.

## Notes

- **Tool scope.** `PERSEUS_VAULT_TOOL_SCOPE=agent` advertises the agent-safe tier only (48 tools). Administrative tools (`perseus_vault_purge`, `perseus_vault_erase`, `perseus_vault_migrate`, `perseus_vault_authority_*`, …) are never advertised to the model under this scope.
- **Storage.** The vault owns its database. Default location: `~/.perseus-vault/data/perseus-vault.db` (override with `PERSEUS_VAULT_DB_PATH` in the row's `config.env`). A fresh store is encrypted automatically; an existing encrypted store needs its key file available to the child process.
- **Remote vaults.** To point DSH at an already-running vault server instead of supervising a local one, use `perseus-vault-http.cordis.yml` (`transport: streamable-http` + bearer token via an ambient variable — never paste secrets into YAML).
- **Automatic injection.** The MCP row is pull-based: the agent calls memory tools when it needs them. For push-based pre-turn recall injection (relevant memories placed in the system prompt before each user turn), add the companion native plugin: [`@perseus-vault/dsh`](https://github.com/Perseus-Computing-LLC/perseus-vault-dsh/tree/main/packages/perseus-vault). Both rows can be mounted together.
