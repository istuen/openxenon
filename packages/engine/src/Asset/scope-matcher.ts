// =============================================================================
// scope-matcher.ts — v0.7+ Blueprint ## Scope 段文件范围校验
//
// 职责：
//   - 校验 ArtifactDeclaration path 是否符合 Blueprint ## Scope.allow / forbid
//   - lock 时由 work-validator.ts 调用（一次性校验，不新增 Probe）
//   - glob 模式匹配复用 infra/probes/glob-utils.matchPattern（Engine 已有依赖）
//
// 来源：design-blueprint-context-template Draft（2026-08-06 grilling）
//       oxn-asset-domain inv-25 (blueprint-scope-declarative)
//       oxn-work-domain inv-35 (artifacts-within-scope)
// =============================================================================

import { matchPattern } from '@openxenon/engine/infra/probes/glob-utils'

/**
 * Blueprint ## Scope 段解析后的内部表示。
 *
 * 缺省值（向后兼容）：
 *   - allow 为空 → 匹配任意路径（allow=[] 等价于 allow=['**']）
 *   - forbid 为空 → 不限制
 */
export interface Scope {
  /** 允许的文件路径 glob 列表；空列表视为允许任意 */
  allow: string[]
  /** 禁止的文件路径 glob 列表 */
  forbid: string[]
  /** 段内 desc 字段（供 lock 错误信息使用） */
  desc: string
}

/**
 * 校验单个路径是否符合 Scope。
 *
 * 规则（来自 inv-35）：
 *   1. path ⊆ Scope.allow（allow 为空 → 允许任意）
 *   2. path ∩ Scope.forbid = ∅（forbid 为空 → 不限制）
 *
 * @returns { ok: true } 或 { ok: false, reason: 'not-in-allow' | 'in-forbid' }
 */
export function validatePathScope(path: string, scope: Scope): { ok: true } | { ok: false; reason: string } {
  if (!matchesAllow(path, scope.allow)) {
    return { ok: false, reason: 'not-in-allow' }
  }
  if (matchesAny(path, scope.forbid)) {
    return { ok: false, reason: 'in-forbid' }
  }
  return { ok: true }
}

/**
 * 路径是否匹配 allow 列表中任意一个 glob。
 *
 * 缺省（allow=[]）→ 允许任意路径。
 */
export function matchesAllow(path: string, allowGlobs: string[]): boolean {
  if (allowGlobs.length === 0) return true
  return allowGlobs.some((glob) => matchPathGlob(path, glob))
}

/**
 * 路径是否匹配 globs 列表中任意一个 glob。
 */
export function matchesAny(path: string, globs: string[]): boolean {
  return globs.some((glob) => matchPathGlob(path, glob))
}

/**
 * 单个 glob 模式匹配。
 *
 * Engine 已有依赖：infra/probes/glob-utils.matchPattern 支持基本 glob（* + ?）。
 * 不引入 minimatch 等额外依赖；接受 glob 语法子集。
 *
 * 路径标准化：
 *   - 去除前导 ./
 *   - 不去除前导 /（绝对路径按绝对匹配）
 *   - glob 以 ** 开头时支持任意嵌套深度
 */
function matchPathGlob(path: string, glob: string): boolean {
  const normalizedPath = path.startsWith('./') ? path.slice(2) : path
  const normalizedGlob = glob.startsWith('./') ? glob.slice(2) : glob

  // ** 模式：递归匹配任意子路径
  if (normalizedGlob.endsWith('/**')) {
    const prefix = normalizedGlob.slice(0, -3) // 去掉 /**
    return (
      normalizedPath === prefix ||
      normalizedPath.startsWith(`${prefix}/`) ||
      // 兼容 packages/cli/** 匹配 packages/cli
      normalizedPath === prefix.replace(/\/$/, '')
    )
  }

  // 双星斜杠 xxx：匹配任意深度下的 xxx（避免 TypeScript 注释解析歧义，glob 字面写为前缀匹配）
  if (normalizedGlob.startsWith('**/')) {
    const suffix = normalizedGlob.slice(3) // 去掉前缀 glob 段
    return matchPattern(normalizedPath, suffix) || matchPatternSuffix(normalizedPath, suffix)
  }

  // 普通 glob（复用 glob-utils）
  return matchPattern(normalizedPath, normalizedGlob)
}

/**
 * 后缀匹配（用于双星斜杠 xxx 模式）：
 * 检查 path 是否以 suffix 结尾（无论前缀深度）。
 */
function matchPatternSuffix(path: string, suffix: string): boolean {
  if (suffix.includes('*') || suffix.includes('?')) {
    const regex = new RegExp(`(^|/)${suffix.replace(/\*/g, '.*').replace(/\?/g, '.')}$`)
    return regex.test(path)
  }
  return path.endsWith(`/${suffix}`) || path === suffix
}
