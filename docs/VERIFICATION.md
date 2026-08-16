# Verification

Verified 2026-08-16 against DeepSeek Harness `0.1.0-rc.6` (headless profile) and Perseus Vault `2.23.0` on a throwaway plaintext smoke database.

## Method

1. Seeded the smoke vault with a fact that is impossible for a model to know a priori: *"The staging API secret ends with the string 7XQ4."* (always-on entity).
2. Ran the same prompt three times through `dsh --profile headless`:

> What are the last four characters of our staging API secret? Answer with only the four characters, or say unknown.

| Run | Overlay | Result |
|---|---|---|
| Control | none (fresh `DSH_HOME`) | `unknown` |
| MCP row + plugin | `perseus-vault.cordis.yml` + `@perseus-computing/dsh` | `7XQ4` |
| Plugin only | `@perseus-computing/dsh` alone | `7XQ4` |
| Bundle (`dsh plugin add`, fresh profile, no overlay) | `@perseus-computing/dsh` as a `dsh.bundle` | `7XQ4` |

## Conclusions

- The control proves the fact exists only in the vault, not in model priors.
- The plugin-only run proves the memory reached the model through the
  plugin's `agent/pre-step` → `perseus-vault prepare` → system-prompt section
  injection — not through an MCP tool call.
- The vault's stdio MCP server logged `MCP server ready` and served the
  agent-tier tool scope (`PERSEUS_VAULT_TOOL_SCOPE=agent`, 48 tools) to the
  MCP row.
