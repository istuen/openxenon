#!/usr/bin/env bun
// =============================================================================
// check-md-canonical.ts (v0.3 md-ssot)
//
// 扫指定目录下的 .md 文件, 校验 v0.3.0 canonical 纯 MD 范式:
//   - 无 `;` 内联分隔符（纯 MD 范式，一行一个 key:value）
//   - 无 `- name: <H3-text>` 冗余（H3 已经是 canonical name）
//   - 无 `items: A, B, C` 逗号字符串（必须用缩进列表表达数组）
//   - 无 `values: [a, b, c]` 内联数组（必须用缩进列表表达）
//
// 物理路径: scripts/check-md-canonical.ts
// 用法:
//   bun scripts/check-md-canonical.ts <dir1> [dir2 ...]
// 输出: JSON 形式 { checked, passed, failed, violations }
// 退出码: 0 = 全部通过；1 = 有 .md 违规
//
// 注册到 lefthook pre-commit (Phase 5)
// =============================================================================

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { runMdPipeline } from '../src/oxl/md-bridge/pipeline.js'
import { extractHeadingContexts } from '../src/oxl/md-bridge/extract-headings.js'
import { extractListFields } from '../src/oxl/md-bridge/extract-list-fields.js'

interface Violation {
  file: string
  line: number
  rule: string
  message: string
}

interface CheckResult {
  checked: number
  passed: number
  failed: string[]
  violations: Violation[]
}

/**
 * 自然语言字段白名单（这些字段允许 `;`，因为它们承载 human-language 内容）
 * 结构性字段（如 type/default/required/domain/blueprint/items/deps 等）必须无 `;`
 */
const NATURAL_LANGUAGE_FIELDS = new Set(['desc', 'value', 'expect', 'guidance', 'instruction'])

/**
 * 检查单个 .md 文件的 canonical 范式违规
 */
export function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  const content = readFileSync(filePath, 'utf-8')

  // 1. 跑 md-bridge pipeline 拿 mdast
  let r
  try {
    r = runMdPipeline({ content, filePath })
  } catch (err) {
    violations.push({
      file: filePath,
      line: 0,
      rule: 'E_MD_INVALID_SYNTAX',
      message: `Pipeline parse failed: ${err instanceof Error ? err.message : String(err)}`,
    })
    return violations
  }
  if (!r.success) {
    violations.push({
      file: filePath,
      line: 0,
      rule: 'E_MD_INVALID_SYNTAX',
      message: `Pipeline errors: ${r.errors.map((e) => e.message).join('; ')}`,
    })
    return violations
  }

  // 2. 提取 H1/H2/H3 上下文 + 列表字段
  const contexts = extractHeadingContexts(r.mdast)

  for (const ctx of contexts) {
    if (!ctx.h2 || !ctx.h3 || !ctx.h3List) continue

    // 仅检查无序列表（`-` / `*`）；编号列表（`1.` `2.`）是 markdown 散文，跳过
    if (ctx.h3List.ordered) continue

    const fields = extractListFields(ctx.h3List)
    const h3Line = ctx.h3Position?.line ?? 0

    for (const field of fields) {
      // Rule 1: `- name: <H3-text>` 冗余
      if (field.key === 'name' && typeof field.value === 'string' && field.value === ctx.h3) {
        violations.push({
          file: filePath,
          line: h3Line,
          rule: 'E_MD_CANONICAL_NAME_REDUNDANT',
          message: `Redundant \`- name: ${field.value}\` — H3 "${ctx.h3}" already serves as canonical name (RFC v0.3.0 §3.4)`,
        })
      }

      // Rule 2: `items: A, B, C` 逗号字符串数组
      if (field.key === 'items' && typeof field.value === 'string' && field.value.includes(',')) {
        violations.push({
          file: filePath,
          line: h3Line,
          rule: 'E_MD_CANONICAL_ITEMS_COMMA_STRING',
          message: `Comma-separated \`items: ${field.value}\` — must use indented list form (RFC v0.3.0 §3.4)`,
        })
      }

      // Rule 3: `values: [a, b, c]` 内联数组（blueprint enum）
      if (field.key === 'values' && typeof field.value === 'string' && field.value.includes(',')) {
        violations.push({
          file: filePath,
          line: h3Line,
          rule: 'E_MD_CANONICAL_VALUES_INLINE_ARRAY',
          message: `Inline array \`values: ${field.value}\` — must use indented list form (RFC v0.3.0 §3.4)`,
        })
      }

      // Rule 4: 标量字段值含 `;`（仅当字段是结构化的，不在 natural-language 白名单内）
      // 自然语言字段 (desc/value/expect/...) 允许 `;`（中文常作为句内分隔符）
      if (typeof field.value === 'string' && field.value.includes(';') && !NATURAL_LANGUAGE_FIELDS.has(field.key)) {
        violations.push({
          file: filePath,
          line: h3Line,
          rule: 'E_MD_CANONICAL_SEMICOLON_INLINE',
          message: `Semicolon in \`- ${field.key}: ...\` — structured field must use separate lines (RFC v0.3.0 §3.4)`,
        })
      }

      // Rule 5: 数组元素含 `;`（应是独立元素；自然语言字段豁免）
      if (Array.isArray(field.value) && !NATURAL_LANGUAGE_FIELDS.has(field.key)) {
        for (const item of field.value) {
          if (typeof item === 'string' && item.includes(';')) {
            violations.push({
              file: filePath,
              line: h3Line,
              rule: 'E_MD_CANONICAL_SEMICOLON_INLINE',
              message: `Semicolon in array element "${item}" of \`${field.key}\` — split into multiple array items`,
            })
          }
        }
      }
    }
  }

  return violations
}

/**
 * 检查指定目录（或单个 .md 文件）的所有 .md 文件
 */
export function checkDirectories(dirs: string[]): CheckResult {
  const result: CheckResult = { checked: 0, passed: 0, failed: [], violations: [] }

  function walk(dir: string) {
    let entries: string[]
    try {
      if (!statSync(dir).isDirectory()) return
      entries = readdirSync(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      let st
      try {
        st = statSync(fullPath)
      } catch {
        continue
      }

      if (st.isFile() && fullPath.endsWith('.md')) {
        result.checked++
        const fileViolations = checkFile(fullPath)
        if (fileViolations.length === 0) {
          result.passed++
        } else {
          result.failed.push(fullPath)
          result.violations.push(...fileViolations)
        }
      } else if (st.isDirectory()) {
        walk(fullPath)
      }
    }
  }

  for (const target of dirs) {
    let st
    try {
      st = statSync(target)
    } catch {
      continue
    }
    if (st.isFile() && target.endsWith('.md')) {
      // 单文件模式
      result.checked++
      const fileViolations = checkFile(target)
      if (fileViolations.length === 0) {
        result.passed++
      } else {
        result.failed.push(target)
        result.violations.push(...fileViolations)
      }
    } else if (st.isDirectory()) {
      walk(target)
    }
  }
  return result
}

// CLI 入口
if (import.meta.main) {
  const dirs = process.argv.slice(2)
  if (dirs.length === 0) {
    console.error('Usage: bun check-md-canonical.ts <dir1> [dir2 ...]')
    process.exit(1)
  }

  const result = checkDirectories(dirs)

  if (result.violations.length === 0) {
    console.log(JSON.stringify({ checked: result.checked, passed: result.passed, failed: 0, violations: [] }, null, 2))
    process.exit(0)
  } else {
    console.log(JSON.stringify(result, null, 2))
    process.exit(1)
  }
}
