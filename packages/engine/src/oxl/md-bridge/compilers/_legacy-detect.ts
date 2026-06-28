/**
 * md-bridge/compilers/_legacy-detect.ts — 旧 :::intent 块检测
 *
 * v0.3 PR-B 改革：
 * - 移除 remark-directive plugin 后，AST 不再含 containerDirective 节点
 * - 此函数保留作为 v0.2 兼容路径：扫描 raw content 检测 :::intent 字符串
 * - 实际检测在 pipeline.ts extractIntents 阶段完成
 *
 * @deprecated v0.3 PR-B 起，统一在 pipeline.ts 检测
 */

import type { Root } from 'mdast'

export interface LegacyIntentBlock {
  position?: { start: { line: number } }
}

/**
 * 检测旧 `:::intent{...}` 容器指令
 *
 * v0.3 PR-B：返回空数组（实际检测在 pipeline.ts）
 * 保留此函数以兼容 v0.2 风格调用方
 */
export function findLegacyIntentBlocks(_mdast: Root): LegacyIntentBlock[] {
  return []
}

/**
 * 基于 raw content 扫描 :::intent 字符串
 * 供 pipeline.ts 调用（PR-B 主路径）
 */
export function findLegacyIntentInContent(content: string): LegacyIntentBlock[] {
  const detected: LegacyIntentBlock[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (/^:::intent(\{|$)/.test(line.trim())) {
      detected.push({ position: { start: { line: i + 1 } } })
    }
  }

  return detected
}
