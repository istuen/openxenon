/**
 * 🆕 v0.6.1-alpha.4 Phase 2: External inline 校验共享模块。
 *
 * External 从顶层 Asset 类型降级为边界类型（Domain/Workflow/Stack）内的 `## Externals` H2 category。
 * 不再是独立 entity（external-compiler.ts 已删除）。
 *
 * 每个 External 引用：
 *   - `url` 或 `path` 二选一（互斥）
 *   - `kind` ∈ ENUM（6 值）
 *   - 可选 ttl / auth / summary
 *
 * 状态（available/unavailable/stale/unknown）存储在 .openxenon/.cache/external-status.json，
 * 不参与 Asset content_hash。
 */

import type { ValidationError } from '../entity-compiler.js'

export const EXTERNAL_KINDS = ['rest-api', 'webhook', 'documentation', 'library', 'config', 'service'] as const

export type ExternalKind = (typeof EXTERNAL_KINDS)[number]

export interface ExternalEntry {
  name: string
  url: string | null
  path: string | null
  kind: string
  ttl: string | null
  auth: string | null
  summary: string | null
}

/**
 * 从 list fields 构造 ExternalEntry（容忍 getScalar 返回 null/undefined）。
 */
export function externalEntryFromFields(
  name: string,
  fields: Array<{ key: string; value: string | null | undefined }>,
): ExternalEntry {
  const get = (k: string): string | null => {
    const f = fields.find((x) => x.key === k)
    return f?.value ?? null
  }
  return {
    name,
    url: get('url'),
    path: get('path'),
    kind: get('kind') ?? '',
    ttl: get('ttl'),
    auth: get('auth'),
    summary: get('summary'),
  }
}

/**
 * 校验单个 External entry。
 * 永远不抛错；错误累积在 errors[]。
 */
export function validateExternal(ext: ExternalEntry, errors: ValidationError[]): void {
  if (!EXTERNAL_KINDS.includes(ext.kind as ExternalKind)) {
    errors.push({
      code: 'E_MD_EXTERNAL_KIND_INVALID',
      message: `External '${ext.name}' has invalid kind: '${ext.kind}'. Valid kinds: ${EXTERNAL_KINDS.join(', ')}`,
      severity: 'error',
    })
  }
  if (ext.url && ext.path) {
    errors.push({
      code: 'E_MD_EXTERNAL_URL_PATH_CONFLICT',
      message: `External '${ext.name}' has both url and path; only one is allowed`,
      severity: 'error',
    })
  }
  if (!ext.url && !ext.path) {
    errors.push({
      code: 'E_MD_EXTERNAL_URL_PATH_REQUIRED',
      message: `External '${ext.name}' needs either url or path`,
      severity: 'error',
    })
  }
}

/**
 * 从 mdast 节点（H3 ## Externals 下）批量提取 External entries。
 * 由各 compiler 在 parse() 阶段调用。
 */
export function parseExternalsFromMdast(mdast: any): ExternalEntry[] {
  // mdast 结构: root > H1 > H2("Externals") > H3(entry-name) > list(fields)
  // 此函数由编译器传入已解析的 externals array，避免直接依赖 mdast 形状
  // 实际由 compiler 从 mdast 自行 walk + 转换为 ExternalEntry，再调用 validateExternal
  if (Array.isArray(mdast)) {
    return mdast as ExternalEntry[]
  }
  return []
}

/**
 * 批量校验多个 External entries。
 */
export function validateExternals(externals: ExternalEntry[]): ValidationError[] {
  const errors: ValidationError[] = []
  for (const ext of externals) {
    validateExternal(ext, errors)
  }
  return errors
}
