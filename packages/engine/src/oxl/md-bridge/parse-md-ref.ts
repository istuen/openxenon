/**
 * md-bridge/parse-md-ref.ts — 解析 `@md/<scope>/<name>` 引用值
 *
 * v0.6.1 PR-2 (D-γ b)：Work 引用值强制 `@md/...` 前缀格式。
 *
 * 格式：`@md/<scope>/<name>`
 *   - prefix：`@md/`（必填）
 *   - scope：`blueprints` | `domains` | `stacks` | `assetmaps`（与 AssetKind 对齐；v0.7 已收敛 `roadmaps` → `assetmaps`）
 *   - name：kebab-case（与 file name 对齐）
 *
 * 校验：
 *   - 不以 `@md/` 开头 → 抛 `E_MD_REFERENCE_PREFIX_INVALID`
 *   - scope 非法 → 抛 `E_MD_REFERENCE_PREFIX_INVALID`
 *   - name 空或含非法字符 → 抛 `E_MD_REFERENCE_PREFIX_INVALID`
 *
 * 不变量：
 *   - 与 reference-checker.ts 内 `@prj/` / `@oxn/` 同级
 *   - 是 L1-OXL 层 helper，可被 WorkCompiler / mdast-to-kernel / reference-checker 共用
 */

import { IAPError, IAPAction } from '../../kernel/contracts/iap-error.js'

/** v0.7 AssetKind 4 类（与 infra/paths.ts:AssetKind 对齐；roadmap → assetmap） */
export type MDScope = 'blueprints' | 'domains' | 'stacks' | 'assetmaps'

export interface MdRef {
  /** 原始字符串（含 `@md/` 前缀） */
  readonly raw: string
  /** scope 段 */
  readonly scope: MDScope
  /** name 段（不含扩展名） */
  readonly name: string
}

/** 4 类合法 scope（runtime set for O(1) lookup） */
const VALID_SCOPES: ReadonlySet<string> = new Set(['blueprints', 'domains', 'stacks', 'assetmaps'])

/**
 * 解析 `@md/<scope>/<name>` 引用值。
 *
 * @param raw 引用字符串（必须非空；前后空白会被 trim）
 * @param expectedKind 调用方预期的 scope 类别（'blueprint' | 'domain' | 'stack' | 'assetmap'）
 *                   用于字段-值一致性校验（🆕 v0.6.4: 'roadmap' → 'assetmap'）
 * @returns 拆解后的 `{ scope, name }`
 * @throws IAPError axis=INTENT, code=REFERENCE_PREFIX_INVALID
 */
export function parseMdRef(raw: string, expectedKind: 'blueprint' | 'domain' | 'stack' | 'assetmap'): MdRef {
  const trimmed = (raw ?? '').trim()

  if (!trimmed) {
    throw new IAPError('INTENT', 'REFERENCE_PREFIX_INVALID', IAPAction.AUTONOMOUS_RETRY, `Empty reference value`, {
      raw: String(raw ?? ''),
      expectedKind,
      hint: 'Work 引用值必须用 `@md/<scope>/<name>` 前缀格式',
    })
  }

  if (!trimmed.startsWith('@md/')) {
    throw new IAPError(
      'INTENT',
      'REFERENCE_PREFIX_INVALID',
      IAPAction.AUTONOMOUS_RETRY,
      `Work reference must use '@md/' prefix (D-γ b), got '${trimmed}'`,
      {
        raw: trimmed,
        expectedKind,
        hint: 'Expected format: @md/<scope>/<name> (e.g., @md/blueprints/dev-workflow)',
      },
    )
  }

  // 切分：去掉 '@md/' 后按 '/' 拆 scope + name
  const stripped = trimmed.slice('@md/'.length)
  const slashIdx = stripped.indexOf('/')
  if (slashIdx === -1) {
    throw new IAPError(
      'INTENT',
      'REFERENCE_PREFIX_INVALID',
      IAPAction.AUTONOMOUS_RETRY,
      `Invalid @md/ reference: missing scope/name separator in '${trimmed}'`,
      {
        raw: trimmed,
        expectedKind,
        hint: 'Expected format: @md/<scope>/<name> with exactly one "/"',
      },
    )
  }
  const scope = stripped.slice(0, slashIdx)
  const name = stripped.slice(slashIdx + 1)

  if (!VALID_SCOPES.has(scope)) {
    throw new IAPError(
      'INTENT',
      'REFERENCE_PREFIX_INVALID',
      IAPAction.AUTONOMOUS_RETRY,
      `Invalid @md/ scope '${scope}' (must be one of: ${[...VALID_SCOPES].join(', ')})`,
      {
        raw: trimmed,
        expectedKind,
        scope,
        name,
      },
    )
  }

  // scope ↔ expectedKind 一致性校验
  const expectedScope =
    expectedKind === 'blueprint'
      ? 'blueprints'
      : expectedKind === 'domain'
        ? 'domains'
        : expectedKind === 'stack'
          ? 'stacks'
          : 'assetmaps'
  if (scope !== expectedScope) {
    throw new IAPError(
      'INTENT',
      'REFERENCE_PREFIX_INVALID',
      IAPAction.AUTONOMOUS_RETRY,
      `Field expects '${expectedScope}' scope, got '${scope}'`,
      {
        raw: trimmed,
        expectedKind,
        scope,
        name,
        hint: `'${expectedKind}' field requires '@md/${expectedScope}/<name>' format (e.g., @md/${expectedScope}/${name})`,
      },
    )
  }

  // name 校验：kebab-case / PascalCase
  if (!name || !/^[A-Za-z][\w-]*$/.test(name)) {
    throw new IAPError(
      'INTENT',
      'REFERENCE_PREFIX_INVALID',
      IAPAction.AUTONOMOUS_RETRY,
      `Invalid asset name '${name}' (must match /^[A-Za-z][\\w-]*$/)`,
      {
        raw: trimmed,
        expectedKind,
        scope,
        name,
      },
    )
  }

  return { raw: trimmed, scope: scope as MDScope, name }
}

/**
 * 把 AssetKind 翻成 MDScope（共用 helper）
 */
export function kindToScope(kind: 'blueprint' | 'domain' | 'stack' | 'assetmap'): MDScope {
  // 🆕 v0.6.4: 'roadmap' → 'assetmap'
  return kind === 'blueprint' ? 'blueprints' : kind === 'domain' ? 'domains' : kind === 'stack' ? 'stacks' : 'assetmaps'
}
