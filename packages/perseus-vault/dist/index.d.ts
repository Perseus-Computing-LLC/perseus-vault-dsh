import type { Context } from '@deepseek-ai/cordis';
export declare const name = "perseus-vault";
export interface PerseusVaultConfig {
    /** Master switch. Default true. */
    enabled?: boolean;
    /** Path or name of the `perseus-vault` executable. Default 'perseus-vault'. */
    command?: string;
    /** SQLite database path (passed as --db). Omit for the vault default. */
    db?: string;
    /** Workspace hash filter (passed as --workspace). Omit for no filtering. */
    workspace?: string;
    /** Max entities from recall_when triggers (--recall-when-limit). Default 10. */
    recallWhenLimit?: number;
    /** Max entities from the always-on/context pull (--context-limit). Default 10. */
    contextLimit?: number;
    /** Character budget for the context portion (--max-context-chars). */
    maxContextChars?: number;
    /** Kill the prepare child after this many ms. Default 3000. */
    timeoutMs?: number;
    /** System-prompt section order. Default 60 (after persona, before tool guidance). */
    order?: number;
    /** System-prompt section name. Default 'perseus-vault-memory'. */
    sectionName?: string;
}
export declare const DEFAULT_CONFIG: Required<Omit<PerseusVaultConfig, 'db' | 'workspace' | 'maxContextChars'>>;
export declare function apply(ctx: Context, raw?: PerseusVaultConfig): void;
declare const _default: {
    name: string;
    apply: typeof apply;
};
export default _default;
