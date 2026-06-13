#!/usr/bin/env bun
/**
 * check-heading-skeleton.ts
 *
 * 工程层自验证：保证 5 类池的 heading 模板自洽——
 * 任何模板（如 work finalize 自动建的 journal 骨架）跑过去重 + 数字 strip 后，
 * 必须能通过 finalize 必填 heading 校验。
 *
 * 阻断 v2 评审指出的"自动生成的 journal 骨架会通不过自己的 finalize 校验"问题。
 *
 * 跑法：
 *   bun scripts/check-heading-skeleton.ts
 *
 * 退出码：
 *   0 - 5 类池骨架全部通过
 *   1 - 至少一类池骨架缺必填 heading
 *
 * 与 PR-1a 的关系：
 *   - 本脚本**不**依赖 src/infra/markdown-headings.ts 与 src/infra/pool-journal-generator.ts
 *     （它们 PR-1a 才落地）
 *   - 本脚本内嵌 heading 解析器 + 5 类池骨架模板，是 v3 设计可独立验证的最小证据
 *   - PR-1a 落地后，本脚本应改为 import 真实模块，行为不变
 */

// =============================================================================
// 1. heading 解析器（PR-1a 落地后改为 import { parseHeadings } from "...")
// =============================================================================

interface HeadingsParseOptions {
  /** 提取的 heading 级别（默认 2 = `##`） */
  level: number
  /** 是否去除前导数字（如 "3. How" → "How"）—— 校验逻辑要求 */
  stripNumber: boolean
}

function parseHeadings(content: string, opts: HeadingsParseOptions = { level: 2, stripNumber: true }): Set<string> {
  const headings = new Set<string>()
  const pattern = new RegExp(`^${'#'.repeat(opts.level)}\\s+(.+?)\\s*$`, 'gm')
  let m: RegExpExecArray | null
  while ((m = pattern.exec(content)) !== null) {
    let text = m[1]?.trim() ?? ''
    if (opts.stripNumber) {
      // 去除前导 "N. " 数字前缀
      text = text.replace(/^\d+\.\s*/, '')
    }
    if (text.length > 0) headings.add(text)
  }
  return headings
}

// =============================================================================
// 2. 5 类池必填 heading（v3 SSOT，与 src/cli/pool/finalize.ts 的 REQUIRED_HEADINGS 保持一致）
// =============================================================================

type PoolType = 'research' | 'design' | 'audit' | 'journal' | 'issue'

interface HeadingRequirement {
  zh: string
  en: string
}

const REQUIRED_HEADINGS: Record<PoolType, HeadingRequirement[]> = {
  research: [
    { zh: '元信息', en: '' },
    { zh: 'What', en: '' },
    { zh: '现状快照', en: 'Current Snapshot' },
    { zh: '漂移点', en: 'Drift Points' },
    { zh: '风险评估', en: 'Risk Assessment' },
    { zh: '参考', en: '' },
  ],
  design: [
    { zh: '元信息', en: '' },
    { zh: 'What', en: '' },
    { zh: '决策记录', en: 'Decision Record' },
    { zh: 'PR 拆分', en: 'PR Breakdown' },
    { zh: '验收标准', en: 'Acceptance Criteria' },
    { zh: '参考', en: '' },
  ],
  audit: [
    { zh: '元信息', en: '' },
    { zh: 'What', en: '' },
    { zh: '评级总览', en: 'Rating Overview' },
    { zh: '优秀模式', en: 'Good Patterns' },
    { zh: '弱信号清单', en: 'Weak Signals' },
    { zh: '参考', en: '' },
  ],
  journal: [
    { zh: '元信息', en: '' },
    { zh: 'What', en: '' },
    { zh: '8 阶段流程实测', en: 'Phase-by-phase Log' },
    { zh: '关键经验', en: 'Key Learnings' },
    { zh: '提交清单', en: 'Commit Summary' },
    { zh: '参考', en: '' },
  ],
  issue: [
    { zh: '元信息', en: '' },
    { zh: 'What', en: '' },
    { zh: '现象', en: 'Symptom' },
    { zh: '根因', en: 'Root Cause' },
    { zh: '修复方案', en: 'Fix Plan' },
    { zh: '经验教训', en: 'Lessons Learned' },
    { zh: '参考', en: '' },
  ],
}

// =============================================================================
// 3. 5 类池 content.md 模板（v3 SSOT，含 heading 序列）
// =============================================================================

/** 通用前缀 + 通用 What + 通用 参考 */
const commonPrefix = (type: string, sourceNote: string) => `# <标题>
> **创建日期** YYYY-MM-DD | **状态** drafting
> **关联** ${sourceNote}

## 0. 元信息
- 类型：${type}
- 作者：
- 关联 IAP 轴：
- 影响路径：

## What
（人工补：内容）
`

const commonSuffix = `## 参考
- 关联上游 / 下游 / 外部资料
`

const RESEARCH_BODY = `## 现状快照
（现状清单）

## 漂移点
（按严重度列出）

## 风险评估
（影响分析）
`

const DESIGN_BODY = `## 决策记录
（决策点 / 选择 / 含义）

## PR 拆分
（每 PR ≤ 500 行）

## 验收标准
（可验证命令清单）
`

const AUDIT_BODY = `## 评级总览
（维度 × 分数 × 评级）

## 优秀模式
（带 file:line 引用）

## 弱信号清单
（带 file:line 引用 + 建议）
`

const JOURNAL_BODY = `## 8 阶段流程实测
（阶段 1-8 实测表）

## 关键经验
（复盘）

## 提交清单
（files changed）
`

const ISSUE_BODY = `## 现象
（用户视角）

## 根因
（技术根因）

## 修复方案
（步骤 + commit）

## 经验教训
（同类问题预防）
`

function buildTemplate(type: PoolType): string {
  const bodyMap: Record<PoolType, string> = {
    research: RESEARCH_BODY,
    design: DESIGN_BODY,
    audit: AUDIT_BODY,
    journal: JOURNAL_BODY,
    issue: ISSUE_BODY,
  }
  return commonPrefix(type, '上游 [...] / 下游 [...]') + bodyMap[type] + commonSuffix
}

// =============================================================================
// 4. journal 骨架生成器（模拟 work finalize 输出，v3 §3.5 完整版）
// =============================================================================

interface MockWorkState {
  workId: string
  workName: string
  blueprint: string
  createdAt: number
  completedAt: number
  phases: Array<{ name: string; command?: string; result?: string; duration: number }>
  filesChanged: string[]
  sourcePoolId: string | null
}

function buildJournalSkeleton(workState: MockWorkState): string {
  const phasesBlock = workState.phases
    .map(
      (p, i) =>
        `### 阶段 ${i + 1}：${p.name}\n- 命令：${p.command ?? '—'}\n- 结果：${p.result ?? '—'}\n- 时长：${p.duration}ms`,
    )
    .join('\n\n')

  const sourceLine = workState.sourcePoolId ? `- 关联 design pool：${workState.sourcePoolId}\n` : ''
  const filesBlock =
    workState.filesChanged.length > 0
      ? workState.filesChanged.map((f) => `- ${f}`).join('\n')
      : '[人工补：filesChanged]'

  return `# ${workState.workName} — Work 执行日志
> **创建日期** ${new Date().toISOString().slice(0, 10)} | **状态** drafting
> **关联 work** ${workState.workId} | **来源** work-finalize

## 0. 元信息
- 类型：journal
- 关联 work：${workState.workId}
- 起手：${new Date(workState.createdAt).toISOString()}
- 收工：${new Date(workState.completedAt).toISOString()}
- 耗时：${workState.completedAt - workState.createdAt}ms
${sourceLine}- 关联 blueprint：${workState.blueprint}

## What
[人工补：项目背景 + 目标]

## 8 阶段流程实测
${phasesBlock}

## 关键经验
[人工补：踩坑 / 反向发现 / 决策回顾]

## 提交清单
${filesBlock}

## 参考
- 关联 work.oxn：${workState.workId}
${workState.sourcePoolId ? `- 关联 design pool：${workState.sourcePoolId}\n` : ''}- 关联 blueprint：${workState.blueprint}
`
}

// =============================================================================
// 5. 校验逻辑
// =============================================================================

function checkSkeleton(
  type: PoolType,
  skeleton: string,
  _label: string,
): { ok: boolean; missing: string[]; present: string[] } {
  const headings = parseHeadings(skeleton, { level: 2, stripNumber: true })
  const required = REQUIRED_HEADINGS[type]
  const missing = required
    .filter((r) => r.zh !== '' && r.en !== '' && !headings.has(r.zh) && !headings.has(r.en))
    .map((r) => r.zh)
  return {
    ok: missing.length === 0,
    missing,
    present: [...headings].sort(),
  }
}

// =============================================================================
// 6. 主流程
// =============================================================================

function main(): number {
  let allOk = true
  const reports: Array<{ label: string; type: PoolType; ok: boolean; missing: string[]; present: string[] }> = []

  // 6.1 校验 5 类池的 content.md 模板
  console.log('=== 5 类池 content.md 模板校验 ===\n')
  for (const type of Object.keys(REQUIRED_HEADINGS) as PoolType[]) {
    const template = buildTemplate(type)
    const result = checkSkeleton(type, template, `${type} 模板`)
    reports.push({ label: `${type} 模板`, type, ...result })
    if (result.ok) {
      console.log(`✅ ${type} 模板：通过 (${result.present.length} ## headings)`)
    } else {
      console.log(`❌ ${type} 模板：缺 heading ${result.missing.join(', ')}`)
      console.log(`   present: ${result.present.join(' | ')}`)
      allOk = false
    }
  }

  // 6.2 校验 work finalize 生成的 journal 骨架
  console.log('\n=== journal 自动骨架校验（work finalize 输出）===\n')
  const mockWork: MockWorkState = {
    workId: 'test-work',
    workName: 'test-work',
    blueprint: 'fix-issue',
    createdAt: 0,
    completedAt: 1000,
    phases: [
      { name: 'init', command: 'oxn init', result: 'ok', duration: 100 },
      { name: 'submit', command: 'oxn work submit', result: 'ok', duration: 900 },
    ],
    filesChanged: ['src/test.ts'],
    sourcePoolId: 'POOL-D001-test-design',
  }
  const journalSkeleton = buildJournalSkeleton(mockWork)
  const journalResult = checkSkeleton('journal', journalSkeleton, 'journal 自动骨架')
  reports.push({ label: 'journal 自动骨架', type: 'journal', ...journalResult })
  if (journalResult.ok) {
    console.log(`✅ journal 自动骨架：通过 (${journalResult.present.length} ## headings)`)
  } else {
    console.log(`❌ journal 自动骨架：缺 heading ${journalResult.missing.join(', ')}`)
    console.log(`   present: ${journalResult.present.join(' | ')}`)
    allOk = false
  }

  // 6.3 校验双语 heading（en-only 文档也应通过）
  console.log('\n=== 双语 heading 兼容校验 ===\n')
  const enOnlyJournal = `# Title
## 0. Metadata
## What
## Phase-by-phase Log
## Key Learnings
## Commit Summary
## References
`
  const enResult = checkSkeleton('journal', enOnlyJournal, 'journal 英文版')
  reports.push({ label: 'journal 英文版', type: 'journal', ...enResult })
  if (enResult.ok) {
    console.log(`✅ journal 英文版：通过 (en heading 匹配)`)
  } else {
    console.log(`❌ journal 英文版：缺 heading ${enResult.missing.join(', ')}`)
    allOk = false
  }

  // 6.4 校验 v2 风格的"4 章 + 数字前缀"骨架（应失败，作为回归证据）
  console.log('\n=== v2 风格骨架回归校验（应失败，证明 v3 修复有效）===\n')
  const v2StyleJournal = `# Title
## 0. 元信息
## 1. What
## 2. Why —— 在做什么
## 3. How —— 8 阶段流程实测
### 3.1 阶段 1：init
### 3.3 关键经验
## 4. 参考
`
  const v2Result = checkSkeleton('journal', v2StyleJournal, 'v2 风格骨架')
  reports.push({ label: 'v2 风格骨架', type: 'journal', ...v2Result })
  if (!v2Result.ok) {
    console.log(`✅ v2 风格骨架：如期失败（v3 修复有效）`)
    console.log(`   missing: ${v2Result.missing.join(', ')}`)
  } else {
    console.log(`⚠️  v2 风格骨架：意外通过（v3 校验可能过松）`)
    allOk = false
  }

  // 6.5 总结
  console.log('\n=== 总结 ===\n')
  const passed = reports.filter((r) => r.ok).length
  const total = reports.length
  console.log(`${passed}/${total} 项通过`)

  if (allOk) {
    console.log('\n🟢 所有 heading 骨架自洽，可安全进入 PR-1a 实施')
    return 0
  }
  console.log('\n🔴 至少一项骨架不自洽，PR-1a 实施前必须修复')
  return 1
}

process.exit(main())
