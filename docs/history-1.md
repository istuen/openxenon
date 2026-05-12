
问：
1、已修复部分问题。
2、根据文档分析与设计如何增加“探索”机制，用于检查代码质量、武器库方面的改进、迭代、涌现。

答：
# 探索机制设计
## 一、问题定义
当前链路是**单向消耗型**：
```
工程师经验 → Forge → Draft → Canonical → Blueprint → Stage → Probe → Verdict
                                                                        │
                                                                        ▼
                                                                     结束了
```
验证完了就完了。没有反馈，没有改进，没有积累。工程师的经验是**一次性**的，AI 的执行结果是**一次性**的。
L3 质量自举要解决的核心问题：**如何让验证结果反过来驱动 Arsenal 和 Blueprint 的改进？**
```
┌─────────────────────────────────────────────────────────────────┐
│ 当前（单向消耗）                                                 │
│                                                                  │
│  经验 ──▶ 资产 ──▶ 验证 ──▶ 结束                                │
│                                                                  │
│  缺失的回路：验证结果 ──▶ 改进资产 ──▶ 更好的验证               │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 目标（闭环迭代）                                                 │
│                                                                  │
│  经验 ──▶ 资产 ──▶ 验证 ──▶ 探索 ──▶ 改进 ──▶ 新资产           │
│       ▲                                        │                 │
│       └────────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
---
## 二、探索的三层架构
遵循已有的 Kernel/Infra 分层原则，探索机制也分三层：
```
┌─────────────────────────────────────────────────────────────────┐
│ 探索机制三层架构                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [数据层] Infra                                                  │
│  ├─ 读取 task-trace.yaml 历史                                    │
│  ├─ 读取 Arsenal 目录结构                                        │
│  ├─ 读取项目源码结构（用于覆盖度分析）                           │
│  └─ 执行 shell 命令（linter、test、coverage）                    │
│                                                                  │
│  [逻辑层] Kernel                                                 │
│  ├─ traceReduce(): 聚合验证历史，计算统计指标                    │
│  ├─ coverageGap(): 对比 Arsenal 与项目结构，发现缺口             │
│  ├─ patternDetect(): 检测重复出现的验证模式                      │
│  └─ suggestionGenerate(): 基于分析结果生成改进建议               │
│       输入: TraceSummary + CoverageReport + Patterns             │
│       输出: Suggestion[] (纯数据，无副作用)                      │
│                                                                  │
│  [行动层] CLI/Daemon                                             │
│  ├─ oxn explore: 触发探索，输出建议                              │
│  ├─ oxn explore --apply: 自动生成 Draft 资产                     │
│  └─ oxn arsenal review: 审查 Arsenal 质量                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
---
## 三、核心数据结构
### 3.1 探索输入
```typescript
// kernel/explore/types.ts
/** 单个 Stage 的验证历史 */
interface StageTrace {
  stageId: string
  stageName: string
  blueprintName: string
  verdict: 'PASSED' | 'FAILED' | 'ESCAPED'
  probeResults: ProbeTraceResult[]
  duration: number          // 毫秒
  timestamp: number
}
/** 探索分析的输入 */
interface ExploreInput {
  traces: StageTrace[]               // 验证历史
  arsenal: ArsenalManifest           // 当前 Arsenal 清单
  projectStructure: string[]         // 项目文件结构
}
```
### 3.2 探索输出
```typescript
/** 探索建议 */
interface Suggestion {
  id: string
  type: 'new_probe' | 'refine_probe' | 'new_stage' | 'refine_stage' | 'new_blueprint' | 'code_quality'
  priority: 'high' | 'medium' | 'low'
  confidence: number          // 0-1，Kernel 计算的可信度
  reason: string              // 为什么提出这个建议
  draft?: DraftAsset          // 可选：自动生成的 Draft YAML
  evidence: TraceEvidence[]   // 支撑建议的 trace 证据
}
/** 探索报告 */
interface ExploreReport {
  timestamp: number
  summary: {
    totalTraces: number
    passRate: number           // 整体通过率
    avgStageDuration: number
    coverageGaps: number       // Arsenal 覆盖缺口数
    repeatedPatterns: number   // 重复模式数
  }
  suggestions: Suggestion[]
}
```
---
## 四、四种探索能力
### 4.1 质量检查（Quality Check）
**目标**：用现有的 Probe 机制检查代码质量，但由探索机制自动发现需要检查什么。
```
┌─────────────────────────────────────────────────────────────────┐
│ 质量检查流程                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Infra] 扫描项目结构                                            │
│     ├─ 检测 package.json → 识别技术栈                            │
│     ├─ 检测 tsconfig.json → TypeScript 项目                      │
│     ├─ 检测 .eslintrc → 有 linter                                │
│     └─ 检测 jest/vitest 配置 → 有测试框架                        │
│                                                                  │
│  [Kernel] 质量规则匹配（纯函数）                                 │
│     ├─ if (hasLinter && !hasLintProbe) → 建议新增 shell_exec    │
│     │   { command: "npm run lint" }                              │
│     ├─ if (hasTestFramework && !hasTestProbe) → 建议新增         │
│     │   shell_exec { command: "npm test" }                       │
│     ├─ if (isTypeScript && !hasTypeCheckProbe) → 建议新增        │
│     │   shell_exec { command: "npx tsc --noEmit" }               │
│     └─ if (hasBuildScript && !hasBuildProbe) → 建议新增          │
│         shell_exec { command: "npm run build" }                  │
│                                                                  │
│  [输出] Suggestion[]                                             │
│     { type: 'code_quality', priority: 'high',                    │
│       reason: '检测到 .eslintrc 但 Arsenal 中无 lint 探针',     │
│       draft: { type: 'shell_exec', parameters: [...] } }         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
Kernel 的质量规则是**纯数据**，不是硬编码逻辑：
```yaml
# arsenals/explore-rules/code-quality.yaml
rules:
  - name: "有 Linter 但无 Lint 探针"
    detect:
      fileExists: ".eslintrc*"
      arsenalMissing: { type: "shell_exec", command: "*lint*" }
    suggest:
      type: "shell_exec"
      description: "执行 Linter 检查"
      parameters:
        - name: command
          value: "npm run lint"
        - name: expectExitCode
          value: 0
  - name: "有测试框架但无测试探针"
    detect:
      fileExists: "jest.config.*"
      arsenalMissing: { type: "shell_exec", command: "*test*" }
    suggest:
      type: "shell_exec"
      description: "执行测试"
      parameters:
        - name: command
          value: "npm test"
        - name: expectExitCode
          value: 0
```
### 4.2 覆盖度分析（Coverage Gap）
**目标**：对比 Arsenal 的 Probe 与项目实际结构，发现哪些该验证的没验证。
```
┌─────────────────────────────────────────────────────────────────┐
│ 覆盖度分析流程                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Infra] 读取两份数据                                            │
│     ├─ 项目文件结构: ["src/kernel/...", "src/infra/...", ...]    │
│     └─ Arsenal 清单: [fs_exists("src"), fs_exists("package.json")]│
│                                                                  │
│  [Kernel] 差集计算（纯函数）                                     │
│     projectFiles = ["src/kernel/types.ts", "src/infra/fs.ts",   │
│                     "src/cli/entry.ts", ...]                     │
│     coveredDirs = arsenal.probes                                │
│                     .filter(p => p.type === 'fs_exists')         │
│                     .map(p => p.params.pattern)                  │
│                                                                  │
│     uncovered = projectDirs - coveredDirs                        │
│                                                                  │
│     // 按重要性排序                                               │
│     priority = uncovered.map(dir => ({                           │
│       dir,                                                       │
│       fileCount: countFilesIn(dir),                              │
│       hasTests: exists(`${dir}/**/*.test.ts`)                    │
│     })).sort(by fileCount desc)                                  │
│                                                                  │
│  [输出] Suggestion[]                                             │
│     { type: 'new_probe', priority: 'medium',                     │
│       reason: 'src/daemon/ 目录有 8 个文件但无 fs_exists 探针', │
│       draft: { type: 'fs_exists',                                │
│                parameters: [{ name: 'pattern', value: 'src/daemon' }] } }│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
### 4.3 模式检测（Pattern Detection）
**目标**：从验证历史中发现重复出现的模式，抽象为可复用的资产。
```
┌─────────────────────────────────────────────────────────────────┐
│ 模式检测流程                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Infra] 读取 task-trace 历史                                    │
│     trace1: [fs_exists("package.json"), fs_exists("src")]        │
│     trace2: [fs_exists("package.json"), fs_exists("src"),        │
│              fs_match("tsconfig.json", "strict": true)]          │
│     trace3: [fs_exists("package.json"), fs_exists("src")]        │
│                                                                  │
│  [Kernel] 模式提取（纯函数）                                     │
│     // 1. 提取每个 trace 的 Probe 序列                           │
│     sequences = traces.map(t => t.probeTypes)                    │
│     // [["fs_exists","fs_exists"],                               │
│     //  ["fs_exists","fs_exists","fs_match"],                    │
│     //  ["fs_exists","fs_exists"]]                               │
│                                                                  │
│     // 2. 找高频子序列                                           │
│     patterns = findFrequentSubsequences(sequences, minFreq=2)    │
│     // → ["fs_exists+fs_exists"] 出现 3 次                      │
│                                                                  │
│     // 3. 泛化为 Stage 模板                                      │
│     template = generalize(pattern)                               │
│     // → Stage: "检查 Node.js 项目基础结构"                      │
│     //    Probes: [fs_exists("package.json"),                    │
│     //             fs_exists("src")]                             │
│                                                                  │
│  [输出] Suggestion[]                                             │
│     { type: 'new_stage', priority: 'medium',                     │
│       confidence: 0.85,                                          │
│       reason: '"package.json + src" 验证模式出现 3 次',          │
│       draft: stage YAML }                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
### 4.4 失败分析（Failure Analysis）
**目标**：从失败的验证中发现 Arsenal 需要改进的地方。
```
┌─────────────────────────────────────────────────────────────────┐
│ 失败分析流程                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Infra] 读取失败 trace                                          │
│     trace: { stageId: "check-lint", verdict: "FAILED",           │
│              probeResults: [                                     │
│                { type: "shell_exec", result: "FAILED",            │
│                  output: "3 errors, 5 warnings" }                │
│              ] }                                                 │
│                                                                  │
│  [Kernel] 失败分类（纯函数）                                     │
│     // 1. 按失败原因分组                                         │
│     groups = groupBy(probeResults, r => r.errorType)             │
│                                                                  │
│     // 2. 判断改进方向                                           │
│     if (probe.type === 'fs_exists' && result === 'FAILED') {     │
│       // 文件不存在 → 可能是 Blueprint 写错了                    │
│       suggest: refine_blueprint (放宽 pattern)                    │
│     }                                                            │
│     if (probe.type === 'shell_exec' && result === 'FAILED') {    │
│       // 命令失败 → 可能需要更细粒度的探针                       │
│       suggest: refine_probe (拆分为多个检查)                      │
│     }                                                            │
│                                                                  │
│  [输出] Suggestion[]                                             │
│     { type: 'refine_probe', priority: 'high',                    │
│       reason: 'shell_exec "npm run lint" 失败率高，              │
│                建议拆分为 type-check + lint 两个探针',            │
│       evidence: [失败的 trace 列表] }                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
---
## 五、CLI 命令设计
### 5.1 `oxn explore`
```bash
# 基础：分析并输出建议
oxn explore
# 指定分析维度
oxn explore --focus quality        # 只看代码质量
oxn explore --focus coverage       # 只看覆盖度
oxn explore --focus patterns       # 只看模式检测
oxn explore --focus failures       # 只看失败分析
# 自动生成 Draft 资产
oxn explore --apply
# 输出格式
oxn explore --json
oxn explore --verbose
```
### 5.2 `oxn arsenal review`
```bash
# 审查 Arsenal 质量
oxn arsenal review
# 输出：
# Arsenal Review
# ─────────────
# 探针: 4 个
#   fs_exists: 2 次 Blueprint 引用, 通过率 95%
#   shell_exec: 1 次 Blueprint 引用, 通过率 70%  ⚠️
#   fs_match: 0 次 Blueprint 引用  ⚠️ 未被使用
#   fs_not_exists: 0 次 Blueprint 引用  ⚠️ 未被使用
#
# 工序: 2 个
#   check-project-structure: 被引用 3 次
#   check-lint: 被引用 1 次, 失败率 30%  ⚠️
#
# 建议:
# 1. [高] shell_exec lint 通过率低，建议拆分
# 2. [中] fs_match / fs_not_exists 未被使用，考虑删除或推广
# 3. [低] 新增 "check-type" 工序，覆盖 TypeScript 类型检查
```
### 5.3 Blueprint 的 explore Stage 类型
```yaml
name: project-health-check
stages:
  - id: verify-structure
    type: verify           # 现有类型：验证
    proof:
      probeRefs:
        - type: fs_exists
          params: { pattern: "package.json" }
  - id: explore-improvements
    type: explore          # 新类型：探索
    config:
      focus: [quality, coverage, patterns]
      autoApply: false     # 不自动生成 Draft，只输出建议
    dependsOn: [verify-structure]
```
探索型 Stage 的 Verdict 不是 PASSED/FAILED，而是：
```typescript
type ExploreVerdict = {
  type: 'EXPLORED'
  suggestions: Suggestion[]
  summary: string
}
```
---
## 六、实现路线
### 6.1 阶段划分
```
┌─────────────────────────────────────────────────────────────────┐
│ 探索机制实现路线                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: 数据基础 (0.1.x)                                      │
│  ├─ Kernel: traceReduce() — 聚合 task-trace 历史                │
│  ├─ Kernel: coverageGap() — 对比 Arsenal 与项目结构              │
│  ├─ CLI: oxn explore --focus coverage                           │
│  └─ 产出: ExploreReport (纯输出，不自动行动)                    │
│                                                                  │
│  Phase 2: 质量检查 (0.1.x)                                      │
│  ├─ Arsenal: explore-rules/ 目录，存放质量规则 YAML              │
│  ├─ Kernel: qualityMatch() — 匹配质量规则                        │
│  ├─ CLI: oxn explore --focus quality                            │
│  └─ CLI: oxn explore --apply (自动生成 Draft Probe)             │
│                                                                  │
│  Phase 3: 模式检测 (0.2)                                        │
│  ├─ Kernel: patternDetect() — 高频子序列提取                    │
│  ├─ Kernel: suggestionGenerate() — 模式泛化为 Stage 模板        │
│  ├─ Blueprint: type: explore 的 Stage                           │
│  └─ 需要 Daemon 长驻（积累足够的 trace 数据）                   │
│                                                                  │
│  Phase 4: 失败分析 (0.2)                                        │
│  ├─ Kernel: failureClassify() — 失败原因分类                    │
│  ├─ Kernel: refineSuggest() — 改进建议生成                      │
│  ├─ CLI: oxn explore --focus failures                           │
│  └─ 涌现：自动检测 Arsenal 需要迭代的方向                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
### 6.2 Phase 1 的具体实现
#### Kernel 层
```typescript
// kernel/explore/trace-reducer.ts
/** 聚合 task-trace 历史 */
export function traceReduce(traces: StageTrace[]): TraceSummary {
  const total = traces.length
  const passed = traces.filter(t => t.verdict === 'PASSED').length
  const failed = traces.filter(t => t.verdict === 'FAILED').length
  const escaped = traces.filter(t => t.verdict === 'ESCAPED').length
  const probeStats = new Map<string, { total: number, passed: number }>()
  for (const trace of traces) {
    for (const pr of trace.probeResults) {
      const stat = probeStats.get(pr.probeType) || { total: 0, passed: 0 }
      stat.total++
      if (pr.result === 'PASSED') stat.passed++
      probeStats.set(pr.probeType, stat)
    }
  }
  return {
    totalStages: total,
    passRate: total > 0 ? passed / total : 0,
    failRate: total > 0 ? failed / total : 0,
    escapeRate: total > 0 ? escaped / total : 0,
    avgDuration: traces.reduce((s, t) => s + t.duration, 0) / (total || 1),
    probeStats: Object.fromEntries(probeStats)
  }
}
```
```typescript
// kernel/explore/coverage-gap.ts
/** 对比 Arsenal 与项目结构，发现覆盖缺口 */
export function coverageGap(
  projectFiles: string[],
  arsenalProbes: ArsenalProbe[]
): CoverageGap[] {
  // 提取 Arsenal 覆盖的目录
  const coveredDirs = new Set<string>()
  for (const probe of arsenalProbes) {
    if (probe.type === 'fs_exists' && probe.params.pattern) {
      const dir = probe.params.pattern.replace(/\/[^/]*$/, '')
      coveredDirs.add(dir)
    }
  }
  // 提取项目实际目录
  const projectDirs = new Set<string>()
  for (const file of projectFiles) {
    const dir = file.replace(/\/[^/]*$/, '')
    if (dir.startsWith('src/')) {
      projectDirs.add(dir)
    }
  }
  // 差集
  const gaps: CoverageGap[] = []
  for (const dir of projectDirs) {
    if (!coveredDirs.has(dir) && !coveredDirs.has(dir.replace(/\/[^/]*$/, ''))) {
      const fileCount = projectFiles.filter(f => f.startsWith(dir + '/')).length
      gaps.push({ dir, fileCount })
    }
  }
  return gaps.sort((a, b) => b.fileCount - a.fileCount)
}
```
#### CLI 层
```typescript
// cli/explore.ts
export async function exploreCommand(focus?: string, apply?: boolean) {
  // 1. Infra: 读取数据
  const traces = await infra.readTraceHistory()
  const arsenal = await infra.readArsenalManifest()
  const projectFiles = await infra.readProjectStructure()
  // 2. Kernel: 分析
  const input: ExploreInput = { traces, arsenal, projectStructure: projectFiles }
  const report = kernel.explore(input, focus)
  // 3. 输出
  console.log(formatReport(report))
  // 4. 可选：自动生成 Draft
  if (apply) {
    for (const suggestion of report.suggestions) {
      if (suggestion.draft) {
        await infra.saveDraftAsset(suggestion.draft)
        console.log(`✅ 已生成 Draft: ${suggestion.draft.name}`)
      }
    }
  }
}
```
---
## 七、涌现（Emergence）机制
"涌现"不是魔法，是**从足够多的验证历史中提取出的模式**。
```
┌─────────────────────────────────────────────────────────────────┐
│ 涌现的形成过程                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  第 1 次任务:                                                    │
│    Blueprint A: [fs_exists("package.json"), fs_exists("src")]    │
│    → 工程师手写的                                                │
│                                                                  │
│  第 2 次任务:                                                    │
│    Blueprint B: [fs_exists("package.json"), fs_exists("src"),    │
│                  shell_exec("npm run lint")]                     │
│    → 工程师手写的                                                │
│                                                                  │
│  第 3 次任务:                                                    │
│    Blueprint C: [fs_exists("package.json"), fs_exists("src")]    │
│    → AI 基于 Skill 生成的                                       │
│                                                                  │
│  ──────── 探索机制介入 ────────                                  │
│                                                                  │
│  Kernel: patternDetect()                                         │
│    → 发现 "fs_exists(package.json) + fs_exists(src)" 出现 3 次  │
│    → 置信度: 0.85                                                │
│    → 生成 Suggestion: new_stage "check-node-project"             │
│                                                                  │
│  工程师: oxn explore → 看到建议 → oxn explore --apply            │
│    → Draft Stage "check-node-project" 自动生成                   │
│    → oxn arsenal promote → Canonical Stage                      │
│                                                                  │
│  第 4 次任务:                                                    │
│    AI: /oxn-forge → 自动引用 "check-node-project" Stage          │
│    → 不再需要手写相同的 Probe 组合                               │
│                                                                  │
│  ──────── 涌现发生 ────────                                     │
│                                                                  │
│  工程师没有显式创建 "check-node-project"，                       │
│  它是从 3 次独立验证中涌现出来的。                               │
│  工程师的角色从"编写"变成了"审查和确认"。                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
---
## 八、与现有架构的边界
探索机制**必须遵守**现有的 Kernel/Infra 分层约束：
| 组件           | 探索机制里能做                                                       | 探索机制里不能做             |
| -------------- | -------------------------------------------------------------------- | ---------------------------- |
| **Kernel**     | 纯函数分析：traceReduce、coverageGap、patternDetect、failureClassify | 任何 I/O，读取文件，执行命令 |
| **Infra**      | 读取 trace 历史，扫描项目结构，执行 linter/test                      | 业务逻辑判断                 |
| **CLI/Daemon** | 调用 Kernel 分析，调用 Infra 读取数据，输出报告                      | 跳过 Kernel 直接做判定       |
探索规则（`explore-rules/` YAML）属于 Arsenal，是纯数据。Kernel 的 `qualityMatch()` 函数读取规则并匹配，但规则的来源是工程师经验，不是 Kernel 的硬编码。
---
## 九、下一步
**Phase 1 最小可行实现**，只做覆盖度分析：
1. 新增 `kernel/explore/` 目录，实现 `traceReduce()` 和 `coverageGap()`
2. 新增 `cli/explore.ts`，实现 `oxn explore --focus coverage`
3. 不改现有代码，不改现有命令
预计代码量：~200 行 Kernel + ~100 行 CLI。
要不要我先输出 Phase 1 的完整代码？

-------------------------------------------

问：这是一个非常完整的设计文档。让我从几个角度深入探索：

---

## 一、关于 "涌现" 的时序问题

文档提到 Phase 3（模式检测）需要 Daemon 长驻来"积累足够的 trace 数据"。但 0.1 是 CLI-direct 模式。

```
CLI-direct 模式下的 trace 积累：
┌─────────────────────────────────────────────────────────────┐
│  问题：每次任务执行完就结束了，trace 数据存在哪里？          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  选项 A：每个项目的 .openxenon/tasks/<task-id>/task-trace.yaml│
│          → 只有该项目能看到自己的历史                         │
│                                                              │
│  选项 B：全局 ~/.openxenon/traces/                           │
│          → 所有项目的 trace 汇总，但 CLI-direct 下谁来汇总？ │
│                                                              │
│  选项 C：探索是"按需"触发，分析时临时读取所有 task-trace.yaml│
│          → 每次 explore 都是全量扫描                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**关键问题**：在没有 Daemon 的情况下，探索机制如何积累和访问跨项目的 trace 数据？

---

## 二、关于建议质量的验证

文档设计了 Suggestion 系统，但没提到如何验证 Suggestion 的质量。

```
探索建议的生命周期：
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Suggestion 生成 → ??? → Arsenal 加入                        │
│       │                │                                    │
│       │                └── 谁来验证这个建议是好的？           │
│       │                                                              │
│       └── Kernel 的 confidence: 0.85                         │
│           → 这个数字是怎么算出来的？                          │
│           → 0.85 的建议 vs 0.6 的建议，差别在哪？           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**可能的风险**：
- 错误模式被当作高频模式
- 偶发的失败被当作需要"改进"的信号
- 工程师的经验和 AI 的推断产生冲突

---

## 三、关于与现有资产的边界

探索机制会生成新的 Probe/Stage，但这些和现有的 DRAFT → CANONICAL 流程是什么关系？

```
当前流程：
Draft Probe → oxn arsenal promote → Canonical Probe → 被 Blueprint 引用

探索流程：
Suggestion{draft: Probe} → ??? → 被 Blueprint 引用

问题：
1. 探索生成的 Draft 需要 "promote" 吗？还是自动变成 Canonical？
2. 如果探索生成了一个低质量的 Probe，谁来拒绝？
3. 探索生成的 Probe  和手动 Forge 的 Probe  优先级谁高？
```

---

## 四、我想深入探讨的方向

1. **Phase 1 的最小可行实现**：如果只实现"质量检查"（扫描项目结构 + 匹配质量规则），最小需要哪些组件？

2. **探索与工程师经验的冲突**：当探索的建议和工程师的直觉不一致时，听谁的？

3. **trace 数据的所有权**：CLI-direct 模式下，trace 数据是属于项目还是属于全局？这影响多人协作场景。

---

你想深入探讨哪个方向？我倾向于先聊 **Phase 1 的最小可行实现**，因为这直接影响 0.1 能不能跑起来。

答：先回答四个问题，再给出 Phase 1 的精确设计。
---
# 一、四个问题的回答
## 问题 1：CLI-direct 下 trace 数据怎么积累
**选 C：按需扫描。** 理由——它和现有架构哲学一致。
```
┌─────────────────────────────────────────────────────────────────┐
│ 为什么选 C                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  当前架构的核心原则：                                             │
│  "文件系统是唯一的状态持久层"                                     │
│                                                                  │
│  task-trace.yaml 已经存在：                                       │
│  .openxenon/tasks/<task-id>/task-trace.yaml                      │
│                                                                  │
│  oxn explore 执行时：                                             │
│  1. glob(".openxenon/tasks/*/task-trace.yaml") → 找到所有 trace  │
│  2. 逐个读取 → 解析为 StageTrace[]                               │
│  3. 交给 Kernel 分析                                             │
│                                                                  │
│  不需要全局汇总，不需要 Daemon，不需要新存储。                    │
│  和 oxn task status 读 task-trace.yaml 是同一个模式。            │
│                                                                  │
│  缺点：trace 多了会慢。                                          │
│  但 0.1 阶段一个项目能有多少 trace？几十个撑死了。               │
│  真正需要优化时，那是 0.2 的事。                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
不选 A（只看当前项目）：因为 Phase 1 先只看当前项目就够了。
不选 B（全局汇总）：CLI-direct 模式下没有全局协调者，强行汇总引入复杂度。
**Phase 1 只看当前项目的 trace。跨项目是 Phase 3 的事。**
---
## 问题 2：Suggestion 质量怎么验证
**Phase 1 不做自动验证。** 理由——没有足够的数据支撑自动决策。
```
┌─────────────────────────────────────────────────────────────────┐
│ Suggestion 的信任模型                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1 (0.1.x):                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Kernel   │───▶│ 报告输出  │───▶│ 工程师看  │                   │
│  │ 纯分析   │    │ (纯数据)  │    │ 人判断    │                   │
│  └──────────┘    └──────────┘    └──────────┘                   │
│                                                                  │
│  不生成 Draft，不给 confidence 分数，不给建议。                  │
│  只输出事实："src/daemon/ 有 8 个文件但无 fs_exists 探针"       │
│  工程师自己决定要不要加。                                        │
│                                                                  │
│  Phase 2 (0.1.x):                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Kernel   │───▶│ Suggestion│──▶│ oxn explore│                  │
│  │ 质量规则 │    │ +Draft   │    │ --apply   │                   │
│  └──────────┘    └──────────┘    └──────────┘                   │
│                                                                  │
│  有了质量规则，可以生成 Draft。                                   │
│  但 Draft 仍然要走 promote 流程。                                │
│  confidence = 规则匹配度 × 历史成功率，不是拍脑袋。              │
│                                                                  │
│  Phase 3 (0.2):                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Kernel   │───▶│ Suggestion│──▶│ 自动验证  │                   │
│  │ 模式检测 │    │ +验证结果 │    │ 闭环     │                   │
│  └──────────┘    └──────────┘    └──────────┘                   │
│                                                                  │
│  有了足够的 trace 数据，可以：                                   │
│  1. 生成 Draft Probe                                            │
│  2. 自动创建 Blueprint 验证这个 Probe                            │
│  3. 如果验证通过 → confidence 提升                                │
│  4. 如果验证失败 → 降级或删除                                    │
│                                                                  │
│  这是真正的涌现。Phase 1 和 2 不碰这个。                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
**核心原则：工程师的判断永远优先。探索机制只提供信息，不做决定。**
---
## 问题 3：和 Draft → Canonical 流程的边界
**探索生成的 Draft 必须走 promote。没有捷径。**
```
┌─────────────────────────────────────────────────────────────────┐
│ Draft 来源对比                                                   │
├──────────────────┬──────────────────────────────────────────────┤
│                  │ 手动 Forge        │ 探索生成                  │
├──────────────────┼───────────────────┼──────────────────────────┤
│ 生成方式         │ oxn forge -s      │ oxn explore --apply      │
│ 产出格式         │ Draft YAML        │ Draft YAML（相同格式）    │
│ 存储位置         │ .openxenon/       │ .openxenon/（相同位置）   │
│ 需要 promote？   │ 是                │ 是                        │
│ 谁来确认？       │ 工程师            │ 工程师                    │
│ 优先级           │ 无区别            │ 无区别                    │
│ 可区分？         │ 可加 source:      │ 可加 source:              │
│                  │   "manual-forge"  │   "explore-coverage"     │
└──────────────────┴───────────────────┴──────────────────────────┘
```
探索只是另一种 Draft 来源，不改变后续流程。这样：
- 不引入新的资产类型
- 不绕过现有的质量门禁
- 工程师始终有最终决定权
---
## 问题 4：深入方向
同意先做 Phase 1。以下是精确设计。
---
# 二、Phase 1 精确设计：覆盖度分析
## 2.1 范围定义
```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1 只做一件事                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  输入：                                                          │
│  ├── 项目文件结构 (Infra 读取)                                   │
│  ├── Arsenal 清单 (Infra 读取)                                   │
│  └── task-trace 历史 (Infra 读取，可选)                          │
│                                                                  │
│  处理：                                                          │
│  └── Kernel 纯函数：对比项目结构 vs Arsenal 覆盖范围             │
│                                                                  │
│  输出：                                                          │
│  └── 覆盖度报告（纯文本/JSON）                                   │
│      ├── 哪些目录有探针覆盖                                      │
│      ├── 哪些目录没有覆盖（缺口）                                │
│      └── 哪些探针从未被 Blueprint 引用                           │
│                                                                  │
│  不做的事：                                                      │
│  ├── 不自动生成 Draft                                            │
│  ├── 不给 confidence 分数                                        │
│  ├── 不跨项目分析                                                │
│  └── 不改任何现有代码                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
## 2.2 新增文件清单
```
src/
├── kernel/explore/          # 新增目录
│   ├── types.ts             # ~30 行：探索相关类型
│   └── coverage.ts          # ~80 行：覆盖度分析纯函数
├── infra/explore.ts         # 新增：~60 行：探索数据采集
└── cli/explore.ts           # 新增：~80 行：oxn explore 命令
```
总计 ~250 行新增代码。不改任何现有文件（除了 `entry.ts` 注册新命令）。
## 2.3 类型定义
```typescript
// kernel/explore/types.ts
/** 项目目录节点 */
export interface ProjectDir {
  path: string              // "src/kernel"
  fileCount: number         // 8
  hasTests: boolean         // 是否包含 .test.ts 文件
  depth: number             // 2 (src/kernel → depth=2)
}
/** Arsenal 中的探针覆盖 */
export interface ProbeCoverage {
  probeType: string         // "fs_exists"
  pattern: string           // "src/kernel"
  source: 'builtin' | 'canonical' | 'draft'
}
/** 覆盖缺口 */
export interface CoverageGap {
  dir: ProjectDir
  coveredBy: ProbeCoverage[]  // 哪些探针覆盖了父目录（如果有的话）
  severity: 'high' | 'medium' | 'low'
    // high: 核心目录(src/kernel, src/infra)无覆盖
    // medium: 业务目录无覆盖
    // low: 测试目录无覆盖
}
/** 未使用的探针 */
export interface UnusedProbe {
  probe: ProbeCoverage
  referencedInBlueprints: number  // 0 = 未被引用
}
/** 覆盖度报告 */
export interface CoverageReport {
  projectDirs: ProjectDir[]
  probeCoverages: ProbeCoverage[]
  gaps: CoverageGap[]
  unusedProbes: UnusedProbe[]
  summary: {
    totalDirs: number
    coveredDirs: number
    coverageRate: number       // 0.0 - 1.0
    totalProbes: number
    unusedProbeCount: number
  }
}
```
## 2.4 Kernel 纯函数
```typescript
// kernel/explore/coverage.ts
import type {
  ProjectDir, ProbeCoverage, CoverageGap,
  UnusedProbe, CoverageReport
} from './types'
/** 核心目录列表（无覆盖 = high severity） */
const CORE_DIRS = ['src/kernel', 'src/infra', 'src/cli']
/**
 * 计算覆盖度报告（纯函数）
 *
 * @param projectDirs - 项目目录结构
 * @param probeCoverages - Arsenal 中的探针覆盖
 * @param blueprintProbeRefs - Blueprint 中引用的探针类型列表
 * @returns 覆盖度报告
 */
export function analyzeCoverage(
  projectDirs: ProjectDir[],
  probeCoverages: ProbeCoverage[],
  blueprintProbeRefs: string[]
): CoverageReport {
  // 1. 计算每个目录的覆盖状态
  const gaps: CoverageGap[] = []
  const coveredDirs: ProjectDir[] = []
  for (const dir of projectDirs) {
    const directCover = probeCoverages.filter(
      p => p.pattern === dir.path || dir.path.startsWith(p.pattern + '/')
    )
    if (directCover.length > 0) {
      coveredDirs.push(dir)
    } else {
      // 检查父目录是否被覆盖
      const parentCover = probeCoverages.filter(
        p => dir.path.startsWith(p.pattern) && p.pattern !== dir.path
      )
      gaps.push({
        dir,
        coveredBy: parentCover,
        severity: classifySeverity(dir, parentCover)
      })
    }
  }
  // 2. 找出未被 Blueprint 引用的探针
  const unusedProbes: UnusedProbe[] = probeCoverages
    .map(p => ({
      probe: p,
      referencedInBlueprints: blueprintProbeRefs.filter(
        ref => ref === p.probeType
      ).length
    }))
    .filter(u => u.referencedInBlueprints === 0)
  // 3. 汇总
  return {
    projectDirs,
    probeCoverages,
    gaps: gaps.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)),
    unusedProbes,
    summary: {
      totalDirs: projectDirs.length,
      coveredDirs: coveredDirs.length,
      coverageRate: projectDirs.length > 0
        ? coveredDirs.length / projectDirs.length
        : 0,
      totalProbes: probeCoverages.length,
      unusedProbeCount: unusedProbes.length
    }
  }
}
function classifySeverity(
  dir: ProjectDir,
  parentCover: ProbeCoverage[]
): 'high' | 'medium' | 'low' {
  // 核心目录无覆盖 = high
  if (CORE_DIRS.includes(dir.path) && parentCover.length === 0) {
    return 'high'
  }
  // 有文件的目录但只被父目录覆盖 = medium
  if (dir.fileCount > 0 && parentCover.length > 0) {
    return 'medium'
  }
  // 其他 = low
  return 'low'
}
function severityOrder(s: 'high' | 'medium' | 'low'): number {
  return s === 'high' ? 0 : s === 'medium' ? 1 : 2
}
```
## 2.5 Infra 数据采集
```typescript
// infra/explore.ts
import { glob } from 'glob'
import { readFile } from 'node:fs/promises'
import type { ProjectDir, ProbeCoverage } from '../kernel/explore/types'
/**
 * 扫描项目目录结构
 * 返回每个 src/ 子目录的文件数和属性
 */
export async function scanProjectStructure(
  projectRoot: string
): Promise<ProjectDir[]> {
  const allFiles = await glob('src/**/*.ts', { cwd: projectRoot })
  const dirMap = new Map<string, { files: string[], hasTests: boolean }>()
  for (const file of allFiles) {
    // 提取目录路径（最多到二级：src/kernel, src/infra, etc.）
    const parts = file.split('/')
    const dirPath = parts.length >= 3
      ? parts.slice(0, 2).join('/')
      : parts.slice(0, -1).join('/')
    const entry = dirMap.get(dirPath) || { files: [], hasTests: false }
    entry.files.push(file)
    if (file.includes('.test.') || file.includes('.spec.')) {
      entry.hasTests = true
    }
    dirMap.set(dirPath, entry)
  }
  return Array.from(dirMap.entries()).map(([path, data]) => ({
    path,
    fileCount: data.files.length,
    hasTests: data.hasTests,
    depth: path.split('/').length
  }))
}
/**
 * 读取 Arsenal 中所有探针的覆盖信息
 */
export async function scanArsenalCoverage(
  projectRoot: string
): Promise<ProbeCoverage[]> {
  // 1. 内置探针（从 builtin.ts 编译进的）
  // 2. Canonical 探针（从 .openxenon/arsenals/ 读取）
  // 3. Draft 探针（从 .openxenon/arsenals/ 读取）
  const coverages: ProbeCoverage[] = []
  // 内置探针的 pattern 需要从 Arsenal 元数据中提取
  // 这里简化为扫描 .openxenon/arsenals/ 目录
  const arsenalDir = `${projectRoot}/.openxenon/arsenals`
  try {
    const draftFiles = await glob('**/draft.yaml', { cwd: arsenalDir })
    const canonicalFiles = await glob('**/canonical.yaml', { cwd: arsenalDir })
    for (const file of [...draftFiles, ...canonicalFiles]) {
      const content = await readFile(`${arsenalDir}/${file}`, 'utf-8')
      // 解析 YAML 提取 type 和 parameters
      // ... (具体实现依赖 YAML 解析库)
      const source = file.includes('draft') ? 'draft' : 'canonical'
      // coverages.push({ probeType, pattern, source })
    }
  } catch {
    // Arsenal 目录可能不存在
  }
  return coverages
}
/**
 * 读取所有 Blueprint 中引用的探针类型
 */
export async function scanBlueprintProbeRefs(
  projectRoot: string
): Promise<string[]> {
  const taskDir = `${projectRoot}/.openxenon/tasks`
  const refs: string[] = []
  try {
    const blueprints = await glob('*/blueprint.yaml', { cwd: taskDir })
    for (const bp of blueprints) {
      const content = await readFile(`${taskDir}/${bp}`, 'utf-8')
      // 解析 YAML，提取 proof.probeRefs[].type
      // ... (具体实现依赖 YAML 解析库)
    }
  } catch {
    // tasks 目录可能不存在
  }
  return refs
}
```
## 2.6 CLI 命令
```typescript
// cli/explore.ts
import { defineCommand } from 'citty'
import { scanProjectStructure, scanArsenalCoverage, scanBlueprintProbeRefs } from '../infra/explore'
import { analyzeCoverage } from '../kernel/explore/coverage'
export const exploreCommand = defineCommand({
  meta: {
    name: 'explore',
    description: '分析项目覆盖度和 Arsenal 质量'
  },
  args: {
    focus: {
      type: 'string',
      alias: 'f',
      description: '分析维度: coverage, quality, patterns, failures',
      default: 'coverage'
    },
    json: {
      type: 'boolean',
      alias: 'j',
      description: 'JSON 输出'
    }
  },
  async run({ args }) {
    if (args.focus !== 'coverage') {
      console.log(`⚠️  "${args.focus}" 分析暂未实现，当前仅支持 coverage`)
      return
    }
    // 1. Infra: 采集数据
    const projectRoot = process.cwd()
    const projectDirs = await scanProjectStructure(projectRoot)
    const probeCoverages = await scanArsenalCoverage(projectRoot)
    const blueprintRefs = await scanBlueprintProbeRefs(projectRoot)
    // 2. Kernel: 分析
    const report = analyzeCoverage(projectDirs, probeCoverages, blueprintRefs)
    // 3. 输出
    if (args.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      printReport(report)
    }
  }
})
function printReport(report: CoverageReport) {
  const { summary, gaps, unusedProbes } = report
  console.log('OpenXenon 覆盖度报告')
  console.log('─'.repeat(40))
  console.log(`目录: ${summary.coveredDirs}/${summary.totalDirs} 已覆盖 (${(summary.coverageRate * 100).toFixed(0)}%)`)
  console.log(`探针: ${summary.totalProbes} 个, ${summary.unusedProbeCount} 个未被引用`)
  console.log()
  if (gaps.length > 0) {
    console.log('覆盖缺口:')
    for (const gap of gaps) {
      const icon = gap.severity === 'high' ? '🔴' : gap.severity === 'medium' ? '🟡' : '🟢'
      const parent = gap.coveredBy.length > 0
        ? ` (父目录 ${gap.coveredBy.map(c => c.pattern).join(', ')} 已覆盖)`
        : ''
      console.log(`  ${icon} ${gap.dir.path} — ${gap.dir.fileCount} 个文件${parent}`)
    }
    console.log()
  }
  if (unusedProbes.length > 0) {
    console.log('未被引用的探针:')
    for (const u of unusedProbes) {
      console.log(`  ⚪ ${u.probe.probeType} (${u.probe.pattern}) [${u.probe.source}]`)
    }
  }
}
```
## 2.7 执行效果示例
```bash
$ oxn explore
OpenXenon 覆盖度报告
────────────────────────────────────────
目录: 3/7 已覆盖 (43%)
探针: 4 个, 1 个未被引用
覆盖缺口:
  🔴 src/daemon — 5 个文件
  🔴 src/infra — 4 个文件
  🟡 src/kernel/explore — 2 个文件 (父目录 src/kernel 已覆盖)
  🟡 src/skills — 8 个文件
未被引用的探针:
  ⚪ fs_not_exists (temp/*) [canonical]
```
---
# 三、Phase 1 的实现顺序
```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1 实现步骤                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: kernel/explore/types.ts                                 │
│  ├─ 纯类型定义，零逻辑                                          │
│  └─ 可以先写测试                                                │
│                                                                  │
│  Step 2: kernel/explore/coverage.ts                              │
│  ├─ analyzeCoverage 纯函数                                       │
│  ├─ 单元测试：已知输入 → 已知输出                                │
│  └─ 不依赖任何 I/O                                              │
│                                                                  │
│  Step 3: infra/explore.ts                                        │
│  ├─ 三个数据采集函数                                             │
│  ├─ 集成测试：用真实项目目录测试                                 │
│  └─ 可以先 hardcode 内置探针的覆盖信息                           │
│                                                                  │
│  Step 4: cli/explore.ts + entry.ts 注册                          │
│  ├─ 组装 Infra + Kernel                                          │
│  ├─ 输出格式化                                                   │
│  └─ pnpm build → ./dist/oxn explore                              │
│                                                                  │
│  Step 5: 用 OpenXenon 自身做第一次探索                           │
│  ├─ oxn explore → 看到覆盖缺口                                   │
│  ├─ 手动 oxn forge probe -s 补上缺口                             │
│  ├─ oxn arsenal promote                                          │
│  └─ 这就是 L3 自举的雏形                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
**Step 5 很关键——用 OpenXenon 探索 OpenXenon 自身的覆盖度，这就是 L3 自举的第一个实例。**
要开始写 Step 1 的代码吗？


-------------------------------------------
问：1、我想到探索是否输出 md 文档（然后可以使用 oxn 自举这份文档是否输出成功）作为探索报告呢？
2、因为我觉得探索是一种很多方面，比如对于项目的代码质量、自动化流程（测试与部署）、业务模板、武器库的适配等。你现在的思路好像是通过OpenXenon 代码来制定类型了，即不够抽象？

答：两个观察都很准。让我重新设计。
---
# 重新思考探索机制
## 对问题 1 的回答：输出 md，自举验证
这是关键突破。不是终端输出，不是 JSON，是 **Markdown 文件**。
```
┌─────────────────────────────────────────────────────────────────┐
│ 探索输出为 md 的完整链路                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  oxn explore coverage                                            │
│       │                                                          │
│       ▼                                                          │
│  Kernel: 分析 → ExplorationResult (纯数据)                      │
│       │                                                          │
│       ▼                                                          │
│  Kernel: renderMarkdown(result) → Markdown 字符串 (纯函数)      │
│       │                                                          │
│       ▼                                                          │
│  Infra: 写入 .openxenon/explore/coverage-report.md              │
│       │                                                          │
│       ▼                                                          │
│  oxn task verify (自举)                                          │
│  ├── fs_exists: ".openxenon/explore/coverage-report.md"  ✅     │
│  └── fs_match: contains "# 覆盖度报告"                   ✅     │
│                                                                  │
│  探索结果本身成了可验证的资产。                                   │
│  和 Blueprint、Arsenal 同级——都是文件系统上的物理事实。          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
这解决了一个隐含问题：**探索结果怎么持久化？** 答案——和 OpenXenon 处理所有东西一样，写成文件。
---
## 对问题 2 的回答：当前设计不够抽象
你说得对。我把探索维度硬编码为 TypeScript 类型了：
```
当前（错误）：
CoverageGap { dir, severity, coveredBy }
UnusedProbe { probe, referencedInBlueprints }
LintResult { ... }
TestCoverage { ... }
→ 每加一个维度就要加类型，改 Kernel，改 CLI
→ 和早期把 Probe 硬编码在 executor.ts 里的错误一模一样
```
正确的抽象方向：**探索维度应该是 Arsenal 资产，不是代码类型。**
```
目标：
Exploration 资产 (YAML) → 定义探索维度
Kernel 探索器 (纯函数) → 通用分析引擎，不理解具体维度
Infra 采集器 → 通用数据采集，不理解具体维度
CLI → 只负责调度
新增探索维度 = 新增 Arsenal 资产，不改代码
```
---
# 重新设计：Exploration 作为 Arsenal 资产
## 核心类比
```
┌─────────────────────────────────────────────────────────────────┐
│ Probe 与 Exploration 的同构关系                                  │
├──────────────────┬──────────────────────────────────────────────┤
│                  │ Probe (验证)          │ Exploration (探索)    │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 原子定义         │ canonical.yaml        │ canonical.yaml       │
│                  │ type + parameters     │ name + scope + rules │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 执行层           │ Infra/probes/         │ Infra/explore/       │
│                  │ 物理观测              │ 物理采集             │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 评判/分析层      │ Kernel/evaluator      │ Kernel/evaluator     │
│                  │ PASSED / FAILED       │ Finding[]            │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 输出             │ Verdict (一行)        │ Markdown (一份报告)  │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 存储位置         │ task-trace.yaml       │ .openxenon/explore/  │
├──────────────────┼───────────────────────┼──────────────────────┤
│ 自举验证         │ 已实现                │ fs_exists + fs_match │
└──────────────────┴───────────────────────┴──────────────────────┘
```
## 统一类型系统
不再为每个探索维度定义具体类型。所有维度共享一套类型：
```typescript
// kernel/explore/types.ts
/**
 * 探索结果 — 所有探索维度的统一输出
 * Kernel 纯函数的输出，不含任何 I/O
 */
export interface ExplorationResult {
  name: string              // "coverage"
  title: string             // "覆盖度报告"
  generatedAt: number       // 时间戳
  findings: Finding[]
  summary: string           // 一句话总结
}
/**
 * 发现 — 最小信息单元
 * 不区分"覆盖缺口"还是"lint 错误"，统一为 Finding
 */
export interface Finding {
  id: string                // "uncovered-src-daemon"
  level: 'info' | 'warning' | 'error'
  message: string           // "src/daemon 有 5 个文件但无 fs_exists 探针"
  location?: string         // "src/daemon"
  suggestion?: string       // "建议添加 fs_exists { pattern: 'src/daemon' }"
  evidence?: Record<string, unknown>  // 结构化证据，供程序消费
}
```
**就这么简单。** 不管是覆盖度分析、代码质量、自动化流程、业务模板适配——输出都是 `Finding[]`。
## 探索器资产定义
```yaml
# arsenals/explorations/coverage/canonical.yaml
name: coverage
description: "检查 Arsenal 对项目结构的覆盖程度"
# 声明这个探索器需要什么输入
scope:
  - project_structure     # 需要项目文件列表
  - arsenal_manifest      # 需要 Arsenal 探针清单
  - trace_history         # 需要 trace 历史（可选）
# 声明输出位置
output: coverage-report.md
# 探索规则（声明式）
rules:
  - name: uncovered-directory
    description: "目录有文件但无 fs_exists 探针覆盖"
    level: warning
    condition: "dir.fileCount >= 3 AND NOT hasDirectProbe(dir, 'fs_exists')"
    message: "{{dir.path}} 有 {{dir.fileCount}} 个文件但无 fs_exists 探针"
    suggestion: "建议添加 fs_exists { pattern: '{{dir.path}}' }"
  - name: unused-probe
    description: "探针存在但从未被 Blueprint 引用"
    level: info
    condition: "probe.blueprintRefCount === 0"
    message: "{{probe.type}} ({{probe.pattern}}) 未被任何 Blueprint 引用"
```
```yaml
# arsenals/explorations/quality/canonical.yaml
name: quality
description: "检查项目代码质量基础设施"
scope:
  - project_structure
  - arsenal_manifest
output: quality-report.md
rules:
  - name: missing-lint-probe
    description: "项目有 linter 配置但无 lint 探针"
    level: warning
    condition: "fileExists('.eslintrc*') AND NOT hasProbe('shell_exec', '*lint*')"
    message: "检测到 linter 配置但无对应的 shell_exec 探针"
    suggestion: "建议添加 shell_exec { command: 'npm run lint' }"
  - name: missing-test-probe
    description: "项目有测试框架但无测试探针"
    level: warning
    condition: "fileExists('jest.config.*|vitest.config.*') AND NOT hasProbe('shell_exec', '*test*')"
    message: "检测到测试框架配置但无对应的 shell_exec 探针"
    suggestion: "建议添加 shell_exec { command: 'npm test' }"
  - name: missing-typecheck-probe
    description: "TypeScript 项目但无类型检查探针"
    level: info
    condition: "fileExists('tsconfig.json') AND NOT hasProbe('shell_exec', '*tsc*')"
    message: "TypeScript 项目但无类型检查探针"
    suggestion: "建议添加 shell_exec { command: 'npx tsc --noEmit' }"
```
```yaml
# arsenals/explorations/automation/canonical.yaml
name: automation
description: "检查自动化流程（CI/CD、测试、部署）的完整性"
scope:
  - project_structure
  - arsenal_manifest
output: automation-report.md
rules:
  - name: missing-ci-config
    description: "项目无 CI 配置"
    level: warning
    condition: "NOT fileExists('.github/workflows/*|.gitlab-ci.yml|Jenkinsfile')"
    message: "未检测到 CI 配置文件"
    suggestion: "建议添加 CI 流水线配置"
  - name: ci-without-oxn-verify
    description: "CI 配置存在但未集成 oxn verify"
    level: info
    condition: "fileExists('.github/workflows/*') AND NOT fileContains('.github/workflows/*', 'oxn')"
    message: "CI 配置未集成 OpenXenon 验证步骤"
    suggestion: "建议在 CI 中添加 oxn task verify 步骤"
```
## Kernel：通用探索引擎
不是为每个维度写一个分析函数，而是一个通用引擎：
```typescript
// kernel/explore/evaluator.ts
import type { Finding, ExplorationResult } from './types'
/**
 * 探索规则定义（从 YAML 解析而来）
 */
export interface ExplorationRule {
  name: string
  description: string
  level: 'info' | 'warning' | 'error'
  condition: string   // 条件表达式
  message: string     // 消息模板
  suggestion?: string // 建议模板
}
/**
 * 探索上下文 — Kernel 纯函数的输入
 * 所有探索维度共享同一个上下文
 */
export interface ExplorationContext {
  // 项目结构
  projectFiles: string[]
  projectDirs: { path: string; fileCount: number; hasTests: boolean }[]
  // Arsenal 状态
  probes: { type: string; pattern: string; source: string }[]
  blueprintProbeRefs: { type: string; count: number }[]
  // Trace 历史
  traceSummary?: {
    totalStages: number
    passRate: number
    probeStats: Record<string, { total: number; passed: number }>
  }
}
/**
 * 通用探索评估器（纯函数）
 *
 * 输入：上下文 + 规则
 * 输出：Finding[]
 *
 * 不理解"覆盖度"或"代码质量"的语义，
 * 只做规则匹配和模板渲染。
 */
export function evaluateExploration(
  context: ExplorationContext,
  rules: ExplorationRule[],
  meta: { name: string; title: string }
): ExplorationResult {
  const findings: Finding[] = []
  for (const rule of rules) {
    const matches = matchRule(context, rule)
    for (const match of matches) {
      findings.push({
        id: `${rule.name}-${match.key}`,
        level: rule.level,
        message: renderTemplate(rule.message, match.vars),
        location: match.vars.location,
        suggestion: rule.suggestion
          ? renderTemplate(rule.suggestion, match.vars)
          : undefined,
        evidence: match.vars
      })
    }
  }
  return {
    name: meta.name,
    title: meta.title,
    generatedAt: Date.now(),
    findings,
    summary: summarize(findings)
  }
}
/**
 * 规则匹配 — 纯函数
 * 
 * 把声明式条件翻译为对 context 的查询
 */
function matchRule(
  context: ExplorationContext,
  rule: ExplorationRule
): MatchResult[] {
  const results: MatchResult[] = []
  // 解析条件表达式
  // "dir.fileCount >= 3 AND NOT hasDirectProbe(dir, 'fs_exists')"
  // → 分解为谓词组合
  const predicates = parseCondition(rule.condition)
  // 根据条件中涉及的变量类型，遍历 context 中对应的条目
  if (involvesDir(rule.condition)) {
    for (const dir of context.projectDirs) {
      const vars = {
        dir: { path: dir.path, fileCount: dir.fileCount },
        location: dir.path
      }
      if (evalPredicates(predicates, vars, context)) {
        results.push({ key: dir.path, vars })
      }
    }
  }
  if (involvesProbe(rule.condition)) {
    for (const probe of context.probes) {
      const vars = {
        probe: { type: probe.type, pattern: probe.pattern },
        location: probe.pattern
      }
      if (evalPredicates(predicates, vars, context)) {
        results.push({ key: `${probe.type}-${probe.pattern}`, vars })
      }
    }
  }
  // ... fileExists, fileContains 等全局谓词
  return results
}
interface MatchResult {
  key: string
  vars: Record<string, unknown>
}
function summarize(findings: Finding[]): string {
  const errors = findings.filter(f => f.level === 'error').length
  const warnings = findings.filter(f => f.level === 'warning').length
  const infos = findings.filter(f => f.level === 'info').length
  return `${errors} 个问题, ${warnings} 个警告, ${infos} 个建议`
}
// 模板渲染（简化版，不引入模板引擎）
function renderTemplate(
  template: string,
  vars: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const parts = path.split('.')
    let value: unknown = vars
    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part]
    }
    return String(value ?? '')
  })
}
```
## Kernel：Markdown 渲染器
```typescript
// kernel/explore/reporter.ts
import type { ExplorationResult, Finding } from './types'
/**
 * 将 ExplorationResult 渲染为 Markdown（纯函数）
 */
export function renderMarkdown(result: ExplorationResult): string {
  const lines: string[] = []
  lines.push(`# ${result.title}`)
  lines.push('')
  lines.push(`> 生成时间: ${new Date(result.generatedAt).toISOString()}`)
  lines.push(`> ${result.summary}`)
  lines.push('')
  // 按 level 分组
  const errors = result.findings.filter(f => f.level === 'error')
  const warnings = result.findings.filter(f => f.level === 'warning')
  const infos = result.findings.filter(f => f.level === 'info')
  if (errors.length > 0) {
    lines.push('## 🔴 问题')
    lines.push('')
    for (const f of errors) {
      lines.push(formatFinding(f))
    }
    lines.push('')
  }
  if (warnings.length > 0) {
    lines.push('## 🟡 警告')
    lines.push('')
    for (const f of warnings) {
      lines.push(formatFinding(f))
    }
    lines.push('')
  }
  if (infos.length > 0) {
    lines.push('## 🟢 建议')
    lines.push('')
    for (const f of infos) {
      lines.push(formatFinding(f))
    }
    lines.push('')
  }
  if (result.findings.length === 0) {
    lines.push('✅ 未发现需要改进的地方。')
  }
  return lines.join('\n')
}
function formatFinding(f: Finding): string {
  let line = `- **${f.message}**`
  if (f.location) line += ` (\`${f.location}\`)`
  if (f.suggestion) line += `\n  - 💡 ${f.suggestion}`
  return line
}
```
## Infra：数据采集 + 报告写入
```typescript
// infra/explore/collector.ts
import { glob } from 'glob'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import type { ExplorationContext } from '../../kernel/explore/evaluator'
/**
 * 采集探索上下文（Infra 层，唯一触碰硬件的组件）
 */
export async function collectContext(
  projectRoot: string
): Promise<ExplorationContext> {
  // 1. 项目文件结构
  const projectFiles = await glob('src/**/*.ts', { cwd: projectRoot })
  const projectDirs = aggregateDirs(projectFiles)
  // 2. Arsenal 探针
  const probes = await collectProbes(projectRoot)
  // 3. Blueprint 引用
  const blueprintProbeRefs = await collectBlueprintRefs(projectRoot)
  // 4. Trace 历史（可选）
  const traceSummary = await collectTraceSummary(projectRoot)
  return { projectFiles, projectDirs, probes, blueprintProbeRefs, traceSummary }
}
/**
 * 写入探索报告（Infra 层，唯一触碰硬件的组件）
 */
export async function saveReport(
  projectRoot: string,
  filename: string,
  markdown: string
): Promise<string> {
  const dir = `${projectRoot}/.openxenon/explore`
  await mkdir(dir, { recursive: true })
  const filepath = `${dir}/${filename}`
  await writeFile(filepath, markdown, 'utf-8')
  return filepath
}
// ... collectProbes, collectBlueprintRefs, collectTraceSummary 的实现
```
## CLI：oxn explore 命令
```typescript
// cli/explore.ts
import { defineCommand } from 'citty'
import { collectContext, saveReport } from '../infra/explore/collector'
import { evaluateExploration } from '../kernel/explore/evaluator'
import { renderMarkdown } from '../kernel/explore/reporter'
import { loadExplorationAssets } from '../arsenals/loader'
export const exploreCommand = defineCommand({
  meta: {
    name: 'explore',
    description: '探索项目状态，生成改进报告'
  },
  args: {
    name: {
      type: 'positional',
      description: '探索器名称 (coverage/quality/automation/all)',
      default: 'all'
    },
    json: {
      type: 'boolean',
      alias: 'j',
      description: 'JSON 输出（不写文件）'
    }
  },
  async run({ args }) {
    const projectRoot = process.cwd()
    // 1. Infra: 采集上下文
    const context = await collectContext(projectRoot)
    // 2. 加载探索器资产（和加载 Probe 资产一样的机制）
    const explorations = await loadExplorationAssets(
      projectRoot,
      args.name === 'all' ? undefined : [args.name]
    )
    // 3. Kernel: 逐个执行探索器
    for (const exploration of explorations) {
      const result = evaluateExploration(
        context,
        exploration.rules,
        { name: exploration.name, title: exploration.description }
      )
      // 4. Kernel: 渲染 Markdown
      const markdown = renderMarkdown(result)
      if (args.json) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        // 5. Infra: 写入文件
        const filepath = await saveReport(
          projectRoot,
          exploration.output,
          markdown
        )
        console.log(`✅ ${exploration.description} → ${filepath}`)
        console.log(`   ${result.summary}`)
      }
    }
  }
})
```
## 执行效果
```bash
$ oxn explore all
✅ 覆盖度检查 → .openxenon/explore/coverage-report.md
   0 个问题, 3 个警告, 1 个建议
✅ 代码质量检查 → .openxenon/explore/quality-report.md
   0 个问题, 2 个警告, 1 个建议
✅ 自动化流程检查 → .openxenon/explore/automation-report.md
   0 个问题, 1 个警告, 0 个建议
```
```bash
$ cat .openxenon/explore/coverage-report.md
# 覆盖度报告
> 生成时间: 2026-05-12T10:30:00.000Z
> 0 个问题, 3 个警告, 1 个建议
## 🟡 警告
- **src/daemon 有 5 个文件但无 fs_exists 探针** (`src/daemon`)
  - 💡 建议添加 fs_exists { pattern: 'src/daemon' }
- **src/infra 有 4 个文件但无 fs_exists 探针** (`src/infra`)
  - 💡 建议添加 fs_exists { pattern: 'src/infra' }
- **src/skills 有 8 个文件但无 fs_exists 探针** (`src/skills`)
  - 💡 建议添加 fs_exists { pattern: 'src/skills' }
## 🟢 建议
- **fs_not_exists (temp/*) 未被任何 Blueprint 引用** (`temp/*`)
```
## 自举验证
```bash
$ oxn task submit -b blueprint-verify-exploration.yaml
# blueprint-verify-exploration.yaml:
# name: verify-exploration-reports
# stages:
#   - id: check-coverage-report
#     name: 检查覆盖度报告已生成
#     proof:
#       probeRefs:
#         - type: fs_exists
#           params: { pattern: ".openxenon/explore/coverage-report.md" }
#   - id: check-quality-report
#     name: 检查质量报告已生成
#     proof:
#       probeRefs:
#         - type: fs_exists
#           params: { pattern: ".openxenon/explore/quality-report.md" }
#   - id: check-coverage-format
#     name: 检查覆盖度报告格式正确
#     proof:
#       probeRefs:
#         - type: fs_match
#           params:
#             pattern: ".openxenon/explore/coverage-report.md"
#             contains: "覆盖度报告"
#     dependsOn: [check-coverage-report]
$ oxn task verify -t <task-id> -s check-coverage-report
# → PASSED ✅
$ oxn task verify -t <task-id> -s check-coverage-format
# → PASSED ✅
```
**探索输出成了可验证的资产。OpenXenon 验证自己的探索结果。这就是自举。**
---
## 和之前设计的对比
```
┌──────────────────┬─────────────────────────┬──────────────────────────────┐
│                  │ 之前的设计               │ 重新设计                     │
├──────────────────┼─────────────────────────┼──────────────────────────────┤
│ 探索维度定义     │ TypeScript 类型          │ Arsenal YAML 资产            │
│                  │ CoverageGap, UnusedProbe │ rules: [{ condition, msg }]  │
├──────────────────┼─────────────────────────┼──────────────────────────────┤
│ 新增维度         │ 改类型 + 改 Kernel + 改  │ 新增一个 YAML 文件           │
│                  │ CLI                      │                              │
├──────────────────┼─────────────────────────┼──────────────────────────────┤
│ 分析引擎         │ 每个维度一个函数          │ 通用 evaluateExploration()   │
├──────────────────┼─────────────────────────┼──────────────────────────────┤
│ 输出             │ 终端文本 / JSON          │ Markdown 文件                │
├──────────────────┼─────────────────────────┼──────────────────────────────┤
│ 可验证性         │ 无                      │ fs_exists + fs_match 自举    │
├──────────────────┼─────────────────────────┼──────────────────────────────┤
│ 和现有架构一致性 │ 独立新机制               │ 和 Probe 同构：              │
│                  │                         │ 资产定义 + Infra执行 +       │
│                  │                         │ Kernel分析 + 文件输出        │
├──────────────────┼─────────────────────────┼──────────────────────────────┤
│ 涌现可能         │ 不可                    │ 可以：探索器本身是资产，     │
│                  │                         │ 模式检测可以生成新探索器     │
└──────────────────┴─────────────────────────┴──────────────────────────────┘
```
---
## 文件清单
```
新增文件（不改任何现有文件）：
src/
├── kernel/explore/
│   ├── types.ts              # Finding, ExplorationResult (~40 行)
│   ├── evaluator.ts          # evaluateExploration 纯函数 (~120 行)
│   └── reporter.ts           # renderMarkdown 纯函数 (~50 行)
│
├── infra/explore/
│   └── collector.ts          # collectContext + saveReport (~80 行)
│
├── cli/explore.ts            # oxn explore 命令 (~60 行)
│
└── arsenals/explorations/    # 探索器资产（YAML）
    ├── coverage/canonical.yaml
    ├── quality/canonical.yaml
    └── automation/canonical.yaml
修改文件：
src/cli/entry.ts              # 注册 explore 子命令（+3 行）
总计：~350 行新增代码 + 3 个 YAML 资产
```
要开始实现吗？


-------------------------------------------
问：

答：

-------------------------------------------
问：

答：

-------------------------------------------
问：

答：

-------------------------------------------