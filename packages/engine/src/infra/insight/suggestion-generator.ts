// =============================================================================
// suggestion-generator.ts (v0.5 PR-D)
//
// L1-Infra: 从 Insight 输出 (CrossProof / Pipeline) 提取结构化改进建议
//
// 用途：`oxn pool create audit --from insight --target <domain>`
//   - 读 stdin 的 JSON (或文件路径)
//   - 解析为 CrossProofInsight 或 PipelineInsight
//   - 按规则生成 audit pool entry metadata (target + kind + patch)
//   - 返回 SuggestionDraft（含 markdown 标题 + content + metadata）
//
// 规则（v0.5 PR-D 简化版）：
//   - Pipeline insight: critical/warning invariant → add-invariant 建议
//   - Cross-proof insight: cross-proof-fail-clusters → add-invariant 建议
//   - Coverage gaps: 严重缺口 → add-observe 建议
//
// L1-Infra 位置：可 import L0-Kernel + L1-Infra 自身。
// =============================================================================

import type {
  CrossProofInsight,
  PipelineInsight,
  ImprovementSuggestionMeta,
  SuggestionKind,
} from '@openxenon/engine/kernel/index'

export interface SuggestionDraft {
  /** 标题（H1） */
  title: string
  /** Markdown 内容（不含 H1，含 ## What/Why/How/影响评估） */
  content: string
  /** metadata 写入 frozen.json */
  meta: ImprovementSuggestionMeta
  /** 生成的 slug */
  slug: string
}

function inferTargetFromDomain(domainName: string): string {
  return `.openxenon/domains/${domainName}.md`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

/**
 * 从 PipelineInsight 生成建议
 * 规则：critical/warning invariant → add-invariant
 */
function fromPipeline(insight: PipelineInsight, targetDomain: string): SuggestionDraft | null {
  const targetInv = insight.invariantEffectiveness.find(
    (i) => i.domainName === targetDomain && (i.status === 'critical' || i.status === 'warning'),
  )
  if (!targetInv) return null

  const text = targetInv.invariantText
  // 提取 invariant 标识符（如 C1、C2、P1）
  const idMatch = text.match(/^([A-Z]\d+):/)
  const id = idMatch?.[1] ?? 'NEW'

  const targetPath = inferTargetFromDomain(targetDomain)
  const kind: SuggestionKind = 'add-invariant'
  const patch = `invariant {\n  "${id}: ${text}"\n}`

  const content = [
    '## What',
    '',
    `在 Domain \`${targetDomain}\` 中新增 invariant：**${text}**`,
    '',
    '## Why',
    '',
    `Pipeline insight 检测到此 invariant 当前状态为 **${targetInv.status}**：`,
    `- works=${targetInv.totalWorks} failed=${targetInv.failedWorks} proofs=${targetInv.totalProofs} hitRate=${(targetInv.hitRate * 100).toFixed(0)}%`,
    '- 关联 work 实际执行中频繁触发相关 probe 失败',
    '',
    '## How',
    '',
    `在 \`${targetPath}\` 的 \`invariant\` 块中新增：`,
    '',
    '```oxn',
    patch,
    '```',
    '',
    '## 影响评估',
    '',
    `- **破坏性**：低（新增 invariant，不修改现有约束）`,
    `- **涉及文件**：\`${targetPath}\``,
    `- **对已有 Work 的影响**：新 invariant 仅在新 \`work finalize\` 时生效`,
  ].join('\n')

  return {
    title: `[${targetDomain}] 新增 invariant "${id}"`,
    content,
    meta: {
      target: 'domain',
      targetName: targetDomain,
      targetPath,
      kind,
      patch,
      source: `pipeline-insight ${targetInv.status}`,
    },
    slug: slugify(`add-invariant-${id}-${targetDomain}-${Date.now()}`),
  }
}

/**
 * 从 CrossProofInsight 生成建议
 * 规则：probe 失败率 ≥ 50% 且失败次数 ≥ 2 → add-invariant
 * 注：v0.6 PR-5d 重命名 probeEffectiveness → probeBehaviorPattern；failRate 仍是"探针行为特征"客观统计
 */
function fromCrossProof(insight: CrossProofInsight, targetDomain: string): SuggestionDraft | null {
  // 取 probeBehaviorPattern 中失败率最高的（行为特征信号）
  const worstProbe = insight.probeBehaviorPattern
    .filter((p) => p.failedProofs >= 2 && p.failRate >= 0.5)
    .sort((a, b) => b.failRate - a.failRate)[0]
  if (!worstProbe) return null

  const id = `CP${Date.now().toString(36).slice(-4).toUpperCase()}`
  const targetPath = inferTargetFromDomain(targetDomain)
  const text = `${id}: ${worstProbe.probeType} 跨 proof 失败率 ${(worstProbe.failRate * 100).toFixed(0)}%（${worstProbe.failedProofs}/${worstProbe.totalRuns}）`
  const patch = `invariant {\n  "${text}"\n}`

  const content = [
    '## What',
    '',
    `在 Domain \`${targetDomain}\` 中新增 invariant：${text}`,
    '',
    '## Why',
    '',
    `Cross-proof insight 检测到该类探针的 AI 行为特征信号：`,
    `- probe type: \`${worstProbe.probeType}\``,
    `- failed/total: ${worstProbe.failedProofs}/${worstProbe.totalRuns}`,
    `- failRate（行为特征统计，非代码质量评分）: ${(worstProbe.failRate * 100).toFixed(0)}%`,
    '',
    '## How',
    '',
    `在 \`${targetPath}\` 的 \`invariant\` 块中新增：`,
    '',
    '```oxn',
    patch,
    '```',
    '',
    '## 影响评估',
    '',
    `- **破坏性**：低（新增 invariant）`,
    `- **涉及文件**：\`${targetPath}\``,
  ].join('\n')

  return {
    title: `[${targetDomain}] 新增 invariant 防御 ${worstProbe.probeType}`,
    content,
    meta: {
      target: 'domain',
      targetName: targetDomain,
      targetPath,
      kind: 'add-invariant',
      patch,
      source: `cross-proof-fail-clusters (${worstProbe.probeType})`,
    },
    slug: slugify(`add-invariant-${worstProbe.probeType}-${targetDomain}-${Date.now()}`),
  }
}

/**
 * 主入口：从原始 insight JSON 字符串生成建议
 */
export function generateSuggestionFromInsight(
  insightJson: string,
  targetDomain: string,
  kind: 'pipeline' | 'cross-proof' = 'pipeline',
): SuggestionDraft | null {
  const insight = JSON.parse(insightJson)
  if (kind === 'pipeline') {
    return fromPipeline(insight as PipelineInsight, targetDomain)
  }
  return fromCrossProof(insight as CrossProofInsight, targetDomain)
}
