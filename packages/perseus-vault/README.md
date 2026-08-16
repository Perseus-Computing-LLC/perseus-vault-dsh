# @perseus-vault/dsh

Perseus Vault memory plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): automatic, push-based memory injection.

The harness's MCP row is pull-based — the agent must remember to call `mcp__perseus_vault__recall`. This plugin closes that gap: on every step that carries a user message it runs [`perseus-vault prepare`](https://github.com/Perseus-Computing-LLC/perseus-vault#prepare) (local SQLite queries, zero LLM calls) and injects the resulting `<memory-prep>` block into the agent's system prompt as the `perseus-vault-memory` section.

## Requirements

- Node.js ≥ 22.18
- `perseus-vault` binary on PATH (pinned: 2.23.0)
- DeepSeek Harness ≥ 0.1.0-rc.5 (developer preview — the seams used here are `agent/created`, `agent/pre-step`, and `systemPrompt.section`)

## Install

From npm (once published):

```sh
npm install @perseus-vault/dsh
```

From the repository while it is unpublished:

```sh
npm install "github:Perseus-Computing-LLC/perseus-vault-dsh#workspace=packages/perseus-vault"
```

Or build locally:

```sh
git clone https://github.com/Perseus-Computing-LLC/perseus-vault-dsh.git
cd perseus-vault-dsh/packages/perseus-vault
npm install
npm run build
```

## Usage

Mount it in a Cordis overlay:

```yaml
- insert:
    - id: perseus-vault-memory
      name: '@perseus-vault/dsh'        # or an absolute path to the built module
      config:
        command: perseus-vault          # executable name or path
        db: ''                          # optional SQLite path; default = vault default
        workspace: ''                   # optional workspace_hash filter
        recallWhenLimit: 10
        contextLimit: 10
        timeoutMs: 3000
        order: 60
```

```sh
dsh web --patch ./my-overlay.cordis.yml
```

Combine with the MCP row (`examples/dsh-mcp/perseus-vault.cordis.yml`) so the agent also has explicit `remember` / `recall` / `capture` tools.

## Config

| Key | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch |
| `command` | `perseus-vault` | Path/name of the vault executable |
| `db` | `''` | `--db` passed to prepare; empty = vault default location |
| `workspace` | `''` | `--workspace` filter; empty = no filtering |
| `recallWhenLimit` | `10` | Max entities from recall_when trigger matches |
| `contextLimit` | `10` | Max entities from the always-on/context pull |
| `maxContextChars` | unset | `--max-context-chars` budget override |
| `timeoutMs` | `3000` | Kill the prepare child after this long |
| `order` | `60` | System-prompt section order (persona is 0; tool guidance 100–199) |
| `sectionName` | `perseus-vault-memory` | Section name (must be unique per layer) |

## Behavior and failure modes

- **Fresh block per user turn.** `agent/pre-step` fires with the messages entering the step; only user-role text triggers a new `prepare` run. Tool-result steps reuse the cached block, so follow-up steps inside a turn stay consistent.
- **Graceful degradation.** Missing binary, prepare timeout, or spawn failure → the section renders empty and the agent loop is never blocked or broken. The first failure logs one warning.
- **No network, no LLM.** Injection runs entirely through the local `perseus-vault prepare` CLI — deterministic, free, and fast enough to run per turn.
- **Capture is pull-based (by design).** End-of-turn capture into the vault is available through the `mcp__perseus_vault__capture` tool from the MCP row. A `agent/turn-stopping` auto-capture hook is planned for v2 once the harness API stabilizes.

## License

MIT
