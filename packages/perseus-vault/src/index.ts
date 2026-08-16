/**
 * Perseus Vault memory plugin for DeepSeek Harness.
 *
 * Push-based memory injection: on every agent step that carries a user
 * message, this plugin runs `perseus-vault prepare` (local, zero-LLM,
 * SQLite-only recall) and injects the resulting `<memory-prep>` block into
 * the agent's system prompt as a contributed section. Pull-based tools
 * (remember/recall/capture/...) come from the MCP config row; both mount
 * cleanly together.
 */
import { spawn } from 'node:child_process'
import type { Context } from '@deepseek-ai/cordis'

export const name = 'perseus-vault'

export interface PerseusVaultConfig {
  /** Master switch. Default true. */
  enabled?: boolean
  /** Path or name of the `perseus-vault` executable. Default 'perseus-vault'. */
  command?: string
  /** SQLite database path (passed as --db). Omit for the vault default. */
  db?: string
  /** Workspace hash filter (passed as --workspace). Omit for no filtering. */
  workspace?: string
  /** Max entities from recall_when triggers (--recall-when-limit). Default 10. */
  recallWhenLimit?: number
  /** Max entities from the always-on/context pull (--context-limit). Default 10. */
  contextLimit?: number
  /** Character budget for the context portion (--max-context-chars). */
  maxContextChars?: number
  /** Kill the prepare child after this many ms. Default 3000. */
  timeoutMs?: number
  /** System-prompt section order. Default 60 (after persona, before tool guidance). */
  order?: number
  /** System-prompt section name. Default 'perseus-vault-memory'. */
  sectionName?: string
}

export const DEFAULT_CONFIG: Required<Omit<PerseusVaultConfig, 'db' | 'workspace' | 'maxContextChars'>> = {
  enabled: true,
  command: 'perseus-vault',
  recallWhenLimit: 10,
  contextLimit: 10,
  timeoutMs: 3000,
  order: 60,
  sectionName: 'perseus-vault-memory',
}

/** Structural view of the dsh agent seams this plugin touches. Declared
 * locally on purpose: the harness is in developer preview with
 * compatibility-breaking changes, and structural typing keeps this plugin
 * resilient to those without global type augmentation conflicts. */
interface AgentLike {
  readonly id: string
  readonly ctx: unknown
}

interface PromptSectionLike {
  name: string
  order: number
  text: string | (() => string)
}

interface SystemPromptLike {
  section(section: PromptSectionLike): () => void
}

interface PreStepPayloadLike {
  agent: AgentLike
  messages: unknown[]
  signal?: AbortSignal
}

type LoggerLike = {
  warn?: (...args: unknown[]) => void
}

function systemPromptOf(agent: AgentLike): SystemPromptLike | undefined {
  const ctx = agent.ctx as { systemPrompt?: SystemPromptLike } | undefined
  return ctx?.systemPrompt
}

function loggerOf(ctx: Context): LoggerLike | undefined {
  return (ctx as unknown as { logger?: LoggerLike }).logger
}

/** Defensive text extraction from dsh UserMessage payloads. Handles plain
 * strings, `{type:'text', text}`, `{text}`, and `{content: string|blocks}`
 * shapes; tool-result blocks yield nothing, which is exactly what we want
 * (prepare only re-runs on user turns). */
function extractText(messages: unknown[], depth = 0): string {
  if (depth > 6) return ''
  const parts: string[] = []
  for (const m of messages) {
    if (typeof m === 'string') {
      parts.push(m)
      continue
    }
    if (typeof m !== 'object' || m === null) continue
    const o = m as Record<string, unknown>
    if (typeof o.text === 'string') parts.push(o.text)
    if (typeof o.content === 'string') parts.push(o.content)
    if (Array.isArray(o.content)) parts.push(extractText(o.content, depth + 1))
    if (Array.isArray(o.blocks)) parts.push(extractText(o.blocks, depth + 1))
    if (Array.isArray(o.messages)) parts.push(extractText(o.messages, depth + 1))
  }
  return parts.filter(Boolean).join('\n').trim()
}

function runPrepare(config: Required<typeof DEFAULT_CONFIG> & PerseusVaultConfig, task: string): Promise<string> {
  const args = ['prepare', '--task', task.slice(0, 4000), '--recall-when-limit', String(config.recallWhenLimit), '--context-limit', String(config.contextLimit)]
  if (config.db) args.push('--db', config.db)
  if (config.workspace) args.push('--workspace', config.workspace)
  if (config.maxContextChars !== undefined) args.push('--max-context-chars', String(config.maxContextChars))
  return new Promise((resolve) => {
    const child = spawn(config.command, args, { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve(ok ? out.trim() : '')
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(false)
    }, config.timeoutMs)
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString('utf8')
    })
    child.on('error', () => finish(false))
    child.on('close', (code) => {
      clearTimeout(timer)
      finish(code === 0)
    })
  })
}

export function apply(ctx: Context, raw?: PerseusVaultConfig): void {
  const config: Required<typeof DEFAULT_CONFIG> & PerseusVaultConfig = { ...DEFAULT_CONFIG, ...(raw ?? {}) }
  if (!config.enabled) return

  const log = loggerOf(ctx)
  const blocks = new Map<string, string>()
  let warnedMissing = false

  ctx.on('agent/created' as any, ({ agent }: { agent: AgentLike }) => {
    const sp = systemPromptOf(agent)
    if (!sp) return
    sp.section({
      name: config.sectionName,
      order: config.order,
      text: () => blocks.get(agent.id) ?? '',
    })
  })

  ctx.on('agent/disposed' as any, ({ agent }: { agent: AgentLike }) => {
    blocks.delete(agent.id)
  })

  ctx.on('agent/pre-step' as any, async (payload: PreStepPayloadLike, next: () => Promise<unknown>) => {
    try {
      const task = extractText(payload.messages)
      if (task) {
        const block = await runPrepare(config, task)
        if (block) {
          blocks.set(payload.agent.id, block)
        } else if (!warnedMissing) {
          warnedMissing = true
          log?.warn?.(`[perseus-vault] prepare failed or timed out (command: ${config.command}). Check that the perseus-vault binary is installed and on PATH.`)
        }
      }
    } catch {
      // Degrade silently: memory injection must never break the agent loop.
    }
    return next()
  })
}

export default { name, apply }
