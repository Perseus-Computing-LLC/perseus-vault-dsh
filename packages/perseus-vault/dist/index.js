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
import { spawn } from 'node:child_process';
export const name = 'perseus-vault';
export const DEFAULT_CONFIG = {
    enabled: true,
    command: 'perseus-vault',
    recallWhenLimit: 10,
    contextLimit: 10,
    timeoutMs: 3000,
    order: 60,
    sectionName: 'perseus-vault-memory',
};
function systemPromptOf(agent) {
    const ctx = agent.ctx;
    return ctx?.systemPrompt;
}
function loggerOf(ctx) {
    return ctx.logger;
}
/** Defensive text extraction from dsh UserMessage payloads. Handles plain
 * strings, `{type:'text', text}`, `{text}`, and `{content: string|blocks}`
 * shapes; tool-result blocks yield nothing, which is exactly what we want
 * (prepare only re-runs on user turns). */
function extractText(messages, depth = 0) {
    if (depth > 6)
        return '';
    const parts = [];
    for (const m of messages) {
        if (typeof m === 'string') {
            parts.push(m);
            continue;
        }
        if (typeof m !== 'object' || m === null)
            continue;
        const o = m;
        if (typeof o.text === 'string')
            parts.push(o.text);
        if (typeof o.content === 'string')
            parts.push(o.content);
        if (Array.isArray(o.content))
            parts.push(extractText(o.content, depth + 1));
        if (Array.isArray(o.blocks))
            parts.push(extractText(o.blocks, depth + 1));
        if (Array.isArray(o.messages))
            parts.push(extractText(o.messages, depth + 1));
    }
    return parts.filter(Boolean).join('\n').trim();
}
function runPrepare(config, task) {
    const args = ['prepare', '--task', task.slice(0, 4000), '--recall-when-limit', String(config.recallWhenLimit), '--context-limit', String(config.contextLimit)];
    if (config.db)
        args.push('--db', config.db);
    if (config.workspace)
        args.push('--workspace', config.workspace);
    if (config.maxContextChars !== undefined)
        args.push('--max-context-chars', String(config.maxContextChars));
    return new Promise((resolve) => {
        const child = spawn(config.command, args, { stdio: ['ignore', 'pipe', 'ignore'] });
        let out = '';
        let settled = false;
        const finish = (ok) => {
            if (settled)
                return;
            settled = true;
            resolve(ok ? out.trim() : '');
        };
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            finish(false);
        }, config.timeoutMs);
        child.stdout.on('data', (d) => {
            out += d.toString('utf8');
        });
        child.on('error', () => finish(false));
        child.on('close', (code) => {
            clearTimeout(timer);
            finish(code === 0);
        });
    });
}
export function apply(ctx, raw) {
    const config = { ...DEFAULT_CONFIG, ...(raw ?? {}) };
    if (!config.enabled)
        return;
    const log = loggerOf(ctx);
    const blocks = new Map();
    let warnedMissing = false;
    ctx.on('agent/created', ({ agent }) => {
        const sp = systemPromptOf(agent);
        if (!sp)
            return;
        sp.section({
            name: config.sectionName,
            order: config.order,
            text: () => blocks.get(agent.id) ?? '',
        });
    });
    ctx.on('agent/disposed', ({ agent }) => {
        blocks.delete(agent.id);
    });
    ctx.on('agent/pre-step', async (payload, next) => {
        try {
            const task = extractText(payload.messages);
            if (task) {
                const block = await runPrepare(config, task);
                if (block) {
                    blocks.set(payload.agent.id, block);
                }
                else if (!warnedMissing) {
                    warnedMissing = true;
                    log?.warn?.(`[perseus-vault] prepare failed or timed out (command: ${config.command}). Check that the perseus-vault binary is installed and on PATH.`);
                }
            }
        }
        catch {
            // Degrade silently: memory injection must never break the agent loop.
        }
        return next();
    });
}
export default { name, apply };
