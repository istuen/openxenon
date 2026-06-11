// =============================================================================
// name-canonical.ts (v1.1 — L0-Contract 物理归位)
//
// 字符串级 name 规范化校验：把任意 string 归一为 kebab-case，用于
// "AST 声明的 entity name" vs "磁盘上的文件/目录 stem" 的一致性比对。
//
// 物理边界：
//   - L0-Contract：可被 L0-Processor / L1-OXN-DSL / L1-Infra / L2 / L3 任意层 import
//   - 仅依赖同层 iap-error（IAPError / IAPAction），不依赖任何 fs / net / child_process
//
// 设计动机（v1.0.2 → v1.1）：
//   - 原 assertNameFileConsistent 在 src/cli/domain.ts（L3），导致
//     parseDomainSlim（L1-OXN-DSL）无法调用 —— 触发 ESLint 架构守卫 +
//     bun scripts/validate-dependencies.ts 双向依赖。
//   - 上移到 L0-Contract 后，所有层可自由 import。
//   - toKebab 的 3 处副本（src/cli/domain.ts / src/oxn-dsl/compiler/blueprint-index-builder.ts
//     / 测试文件）统一收敛到本模块。
//
// 历史：
//   - v1.0.2 (PR-X): assertNameFileConsistent 在 src/cli/domain.ts:357,
//     签名 entityType: 'domain' | 'blueprint' | 'work'（3 类）
//   - v1.1 (本 PR): 扩展 entityType 含 'proof'（目录式布局）。新增
//     assertDirNameConsistent 包装：目录名（work/proof）一致性比对。
// =============================================================================

import { basename } from 'path'
import { IAPAction, IAPError } from './iap-error'

// =============================================================================
// toKebab — 字符串归一化
// =============================================================================

/**
 * 把任意 string 归一化为 kebab-case（lowercase + 驼峰转 - + _ 转 -）。
 * 例: "MemberContext" → "member-context"; "wechat_minigame" → "wechat-minigame"
 *
 * 与原 src/cli/domain.ts:toKebab 完全相同 —— 字符串归一不依赖文件系统。
 * macOS APFS / Windows NTFS 默认 case-insensitive 会假命中（"MemberContext.oxn"
 * 与 "member-context.oxn" 同一 inode），故必须用字符串比对而非 fs lookup。
 */
export function toKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

// =============================================================================
// assertNameFileConsistent — 文件式布局（domain / blueprint）
// =============================================================================

/**
 * v1.0.2 NAME_FILE_MISMATCH 防御（文件式布局）。
 *
 * 用法：domain / blueprint 这类 **.oxn 文件**与 entity name 的比对。
 *   - declared: AST 内的 `domain "X"` 或 `blueprint "X"` 中的 X
 *   - filePath: .oxn 文件的绝对或相对路径
 *   - entityType: 用于错误上下文与未来扩展
 *
 * 行为：declared 与 basename(filePath) 去后缀后,两者过 toKebab 归一比对。
 *       不一致 → 抛 IAPError NAME_FILE_MISMATCH。
 */
export function assertNameFileConsistent(
  declared: string,
  filePath: string,
  entityType: 'domain' | 'blueprint' | 'work' | 'proof',
): void {
  const fileStem = basename(filePath).replace(/\.oxn$/i, '')
  const declaredNorm = toKebab(declared)
  const fileNorm = toKebab(fileStem)
  if (declaredNorm !== fileNorm) {
    throw new IAPError(
      'INTENT',
      'NAME_FILE_MISMATCH',
      IAPAction.YIELD_TO_HUMAN,
      `Declared name '${declared}' does not match file '${fileStem}.oxn'`,
      {
        entityType,
        declared,
        file: `${fileStem}.oxn`,
        normalized: declaredNorm,
        suggestion:
          `Either rename the file to '${declaredNorm}.oxn', ` +
          `or change the declared name to match the file. ` +
          `OXN does not enforce casing style, only canonicalization consistency.`,
      },
    )
  }
}

// =============================================================================
// assertDirNameConsistent — 目录式布局（work / proof）
// =============================================================================

/**
 * v1.1 NAME_FILE_MISMATCH 防御（目录式布局）。
 *
 * 用法：work / proof 这类 **目录式**布局（works/<w>/work.oxn 与 proofs/<p>/proof.oxn）。
 *   - declared: AST 内的 `work "X"` 或 `proof "X"` 中的 X
 *   - dirPath: 所在目录的绝对或相对路径（work.oxn/proof.oxn 的 parent dir）
 *   - entityType: 用于错误上下文
 *
 * 行为：declared 与 basename(dirPath) 过 toKebab 归一比对。
 *       不一致 → 抛 IAPError NAME_FILE_MISMATCH。
 */
export function assertDirNameConsistent(declared: string, dirPath: string, entityType: 'work' | 'proof'): void {
  const dirName = basename(dirPath)
  const declaredNorm = toKebab(declared)
  const dirNorm = toKebab(dirName)
  if (declaredNorm !== dirNorm) {
    throw new IAPError(
      'INTENT',
      'NAME_FILE_MISMATCH',
      IAPAction.YIELD_TO_HUMAN,
      `Declared name '${declared}' does not match directory '${dirName}'`,
      {
        entityType,
        declared,
        dir: dirName,
        normalized: declaredNorm,
        suggestion:
          `Either rename the directory to '${declaredNorm}', ` +
          `or change the declared name to match the directory. ` +
          `OXN does not enforce casing style, only canonicalization consistency.`,
      },
    )
  }
}
