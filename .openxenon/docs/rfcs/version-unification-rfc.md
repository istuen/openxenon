# 版本统一规划 RFC

> **日期**：2026-07-10（v1.0 Draft）
> **状态**：📝 Draft（待 review）
> **基础**：v0.6.x-roadmap-rfc.md（已被 Superseded）· three-boundary-blueprint-elevation-rfc.md
> **作者**：opencode（与 user 协作，2026-07-10）
> **范围**：全项目版本路线统一——以"信任链"为核心重新规划版本路线
> **核心命题**：OpenXenon 解决工程师与 AI Agent 的信任协作问题。信任链是 OpenXenon Engine 的"能源"。

---

## 0. 背景与动机

### 0.1 版本冲突

v0.6.x observability 路线图（`.openxenon/docs/rfcs/_archive/v0.6.x-roadmap-rfc.md`，✅ Approved 2026-07-01）规划了 5 个 release：

| 路线图规划 | 主题 |
|---|---|
| v0.6.1 | Daemon + Hall skeleton + Hook event stream + Token stats |
| v0.6.2 | Insight 收集层 + 强制人工审核 |
| v0.6.3 | Asset 分级 + Token 经济学 |
| v0.6.4 | Hook 框架深化 |
| v0.6.5 | 文档叙事统一 + Hall v0 |

**实际开发走了完全不同的路线**：

| 实际版本 | 内容 |
|---|---|
| v0.6.1-alpha.0 | debug session patches |
| v0.6.1-alpha.1 | Asset Paper 4 字段 + Roadmap entity + library/external entity + kind-isolation 原则 |
| feat/doc-three-tier-arch (+23 commits) | 三层文档架构 + Roadmap CLI + oxn-asset skill + WorkMode 删除 |

### 0.2 冲突清单

| # | 矛盾 | 影响 |
|---|---|---|
| C-1 | v0.6.x roadmap 规划 v0.6.1=Daemon，实际 v0.6.1=Asset 类型体系 | roadmap RFC 需废弃重写 |
| C-2 | v0.5.0/v0.6.0 有 changelog 无 git tag | 版本追溯断裂（决策：不补打） |
| C-3 | `changes/0-6-3-asset-paper.md` 预设 v0.6.3 做 Asset Paper，实际已在 alpha.1 做 | changelog 预设与实际不符 |
| C-4 | ADR-0019 标记 Adopted 但已在代码中废弃 | ADR 状态漂移 |
| C-5 | 三边界 RFC 目标 v0.6.1-alpha.2~v0.6.1，与旧 roadmap 的 v0.6.1 规划冲突 | 版本号冲突 |
| C-6 | `changes/` 已预设 v0.7.0/v0.7.1/v0.7.2/v0.8.0 片段，时间线需因 v0.6.x 偏离而调整 | 预设 changelog 过期 |
| C-7 | 5 份 observability 设计稿锁定在旧版本号 | 设计稿版本号需重映射 |

### 0.3 根因

v0.6.x roadmap RFC 在 2026-07-01 拍板时，基于"v0.6.0 IAP 重构已稳定，下一步做可观测性"的假设。但实际开发中，Asset 类型体系的深化需求（Asset Paper + Roadmap + kind-isolation + 三边界框架）优先级高于可观测性，导致路线图与实际完全偏离。

### 0.4 信任链——OpenXenon Engine 的"能源"

OpenXenon 解决的是工程师与 AI Agent 的信任协作问题。AI 是概率性推理模型，其本身就是不确定性的。工程师信任 AI 一定会执行，但不信任 AI 执行在边界内。AI 不懂"信任"，只会通过概率推理执行，但其信任 OpenXenon 提供的确定性内容（Asset、Work、Kernel）。

```
         工程师                    AI Agent
        (确定性主体)              (概率性主体)
            │                        │
            │  不确定性的协作          │
            │  ← 不可信任 →           │
            │                        │
            ▼                        ▼
         OpenXenon（确定性层）
         ┌─────────────────────┐
         │  Asset (确定性边界)  │
         │  Work (确定性结构)   │
         │  Kernel (确定性验证) │
         │  Proof (确定性证据)  │
         └─────────────────────┘
            │                        │
            ▼                        ▼
    工程师信任 OXN               AI 信任 OXN
    "OXN 出示证据，               "OXN 提供确定性
     告知 AI 执行了什么，           Asset/Work/Kernel，
     哪些在边界内，                我能获取反馈，
     哪些在边界外"                 推理方向是否在边界内，
                                 但是否跨越依然是我自己处理"
            │
            ▼
    工程师通过 OXN 信任 AI
    "我知道 AI 一定会执行，
     OXN 告诉我哪些可靠、
     哪些不可靠"
```

工程师与 AI 原本是两个点协作，但这个协作充满不确定性导致不可信任。OpenXenon 加入后是分别跟两者建立信任协作，然后让工程师可以通过 OpenXenon 信任 AI。

**信任链是 OpenXenon Engine 的"能源"**——没有信任链，OXN 只是任务跟踪器，不是信任协作工具。

---

## 1. 决策

### 1.1 废弃旧 v0.6.x 路线图

- `v0.6.x-roadmap-rfc.md` 标记为 **Superseded**（已执行）
- `v0.6.x-observability-roadmap-sprint-plan.md` 标记为 **Superseded**（已执行）
- `v0.6.x-observability-roadmap-changelog.md` 标记为 **Superseded**（已执行）
- 5 份 observability 设计稿保留为 v0.7 设计参考（已重映射文件名）

### 1.2 可观测性系列合并进 v0.7

旧 v0.6.x observability 路线图的 5 个 release（Daemon/Insight/Token/Hook/Hall）不是信任闭环的必需项——它们是**信任链效率层**（让闭环运作得更高效、更自动化）。因此整体合并进 v0.7 系列，与涌现层（Insight apply 闭环 + 模式库）一起规划。

5 份设计稿保留在 `pools/drafts/` 作为 v0.7 的设计参考，文件名已重映射（见 §6.2），但不再绑定独立版本号。

### 1.3 v0.6.1 = 最小信任闭环

v0.6.1 的 scope 不是"Asset 类型体系闭环"，而是**最小信任闭环**——OpenXenon Engine 的"能源"就位。

v0.6.1 需要修复的信任链断裂点：

| 断裂点 | 信任后果 | 修复 |
|---|---|---|
| 边界表达不清（6 类型混乱） | 工程师无法确定性地定义"可靠" | 三边界框架（OXL coherence） |
| AI 执行无真实验证（A3） | OXN 出示的证据是假的——"passed: true"是占位符不是公证 | submit 真正执行 Probe |
| 失败路径无证据（A1） | 工程师看不到 AI 不可靠的部分——盲信非信任 | finalizeWork 全路径写 frozen.json |
| 边界违反无记录（A2） | OXN 不告知工程师 AI 跨越了边界——证据缺失 | 接通 finalizeWorkDomains（确定性记录，非硬阻断） |

> **A2 的重新理解**：A2 不是"阻止 AI 跨越边界"——AI 是否跨越边界是 AI 自己的概率决策。A2 是"OXN 确定性地告知工程师 AI 跨越了边界"——Domain proof FAIL 时在 frozen.json 中记录"边界违反"。工程师看到证据后决定：调整边界（Asset evolve）还是接受（finalize with warning）。

### 1.4 tag 策略

- **不补打** v0.5.0 / v0.6.0 tag（虽然有 changelog）
- 从 **v0.6.1** 开始正式记录 tag
- v1.0.0-alpha tag 保留（里程碑占位）

### 1.5 v0.7+ 重新规划

v0.7 合并原 v0.6.2~v0.6.6 可观测性系列 + 原 v0.7.0~v0.7.2 涌现层。v0.8 外部信息流不变（部分基础设施已在 v0.6.1 就位）。v0.9~v1.0 不变。

---

## 2. 统一版本路线

```
已完成（有 changelog，部分有 tag）
──────────────────────────────────
v0.4.0 (tagged) ─── Asset Unify-MD
v0.5.0 (untagged) ─── Proof->Insight->Intent 闭环
v0.6.0 (untagged) ─── IAP 架构重构 (monorepo + E1-E4 + L0-L3)

v0.6.1 = 最小信任闭环（进行中）
──────────────────────────────────
v0.6.1-alpha.0 ─── debug patches (已合入)
v0.6.1-alpha.1 ─── Asset Paper + Roadmap + kind-isolation
v0.6.1-alpha.2 ─── 三边界 Phase 0: DRY + Workflow 改名 + 编译器
v0.6.1-alpha.3 ─── 三边界 Phase 1: Blueprint 提升 + Work 引用简化
v0.6.1-alpha.4 ─── 三边界 Phase 2: External inline + Library/External 删除
v0.6.1-alpha.5 ─── Work A3 修复: submit 真正执行 Probe (确定性验证)
v0.6.1-alpha.6 ─── Work A1 修复: finalizeWork 全路径写 frozen.json (确定性证据)
v0.6.1-alpha.7 ─── Work A2 修复: 接通 finalizeWorkDomains (确定性记录)
v0.6.1 (release) ─── 合并 + ADR/文档 + changelog

v0.7 = 信任链效率层（可观测性 + 涌现层 合并）
──────────────────────────────────────────────
v0.7.0 ─── Daemon 完整化 + Insight 自动收集 + Hall v0.5
v0.7.1 ─── Insight apply 闭环 + 模式库 + Mermaid 图
v0.7.2 ─── Token 经济学 + Hook 框架 + Hall 协同健康度

v0.8 = 信任链外部扩展
──────────────────────
v0.8.0 ─── Skill 远程 Registry + Asset 知识库
v0.8.1 ─── Probe 生态市场 + 跨项目 Insight
v0.8.2 ─── 熵增监测 + Hall WebSocket

v0.9 = 自组织
──────────────
v0.9.0 ─── 自适应 Blueprint + AI Agent 多样性
v0.9.1 ─── 非线性反馈回路

v1.0 = 临界点
──────────────
v1.0.0 ─── CAS 完整化 + Engine 独立发布
v1.0.1 ─── v1.0 收官
v1.x+  ─── 综合集成
```

### 2.1 时间线

```
2026-07: v0.6.1-alpha.0~alpha.7 + release (最小信任闭环)
2026-11~2027-01: v0.7.0~v0.7.2 (信任链效率层)
2027-02~04: v0.8.0~v0.8.2 (信任链外部扩展)
2027-05~07: v0.9.0~v0.9.1 (自组织)
2027-08~10: v1.0.0~v1.0.1 (临界点)
2027-11+: v1.x+ (综合集成)
```

### 2.2 信任链在各版本中的角色

| 版本 | 信任链角色 | 核心命题 |
|---|---|---|
| **v0.6.1** | 信任链就位 | 确定性边界 + 确定性验证 + 确定性证据 + 确定性记录 |
| **v0.7** | 信任链效率 | 自动化证据收集 + 自动化边界违反识别 + 可视化信任分布 |
| **v0.8** | 信任链外部扩展 | 外部 Skill/Probe 的信任接入 + 跨项目信任传递 |
| **v0.9** | 信任链自适应 | 系统自动识别信任薄弱点 + 自适应边界调整建议 |
| **v1.0** | 信任链完整化 | CAS 七要素 + 临界条件识别 + 突变引导 |

---

## 3. v0.6.1 = 最小信任闭环

### 3.1 信任链的四层确定性

v0.6.1 必须让信任链的每一层确定性都就位：

| 确定性层 | 模块 | 信任职责 | 实现方式 |
|---|---|---|---|
| **确定性边界** | OXL + Asset | 工程师确定性地定义"可靠"；AI 确定性地解析边界 | 三边界框架（Workflow 改名 + Blueprint 提升 + External 收敛） |
| **确定性验证** | Kernel + Proof | OXN 出示真实验证结果（非合成占位符） | A3：submit 真正执行 Probe，连接 Work → Kernel verdict |
| **确定性证据** | Proof | 不可篡改的执行事实记录（含失败路径） | A1：finalizeWork 全路径写 frozen.json（含失败路径） |
| **确定性记录** | Proof + Work | OXN 确定性地记录边界违反（非阻止，是告知） | A2：接通 finalizeWorkDomains，Domain proof FAIL 时在证据中标记 |

### 3.2 已完成内容

| 内容 | 来源 | 信任链角色 |
|---|---|---|
| Asset Paper 4 字段（abstract/references/citations/auditTrail） | v0.6.1-alpha.1 | 确定性边界（Asset 可追溯） |
| Roadmap entity + scene CLI | alpha.1 + doc-three-tier-arch | 确定性边界（导航确定性） |
| kind-isolation 原则 | 2026-07-10 journal | 确定性边界（引用拓扑确定） |
| 三层文档架构 | feat/doc-three-tier-arch | 确定性边界（文档分层确定） |
| oxn-asset skill | feat/doc-three-tier-arch | 确定性边界（Asset 操作确定） |
| WorkMode 删除 | feat/doc-three-tier-arch | 确定性结构（Blueprint 承载行为差异） |
| MD-native canonical flip | v0.6.1 PR-3 | 确定性边界（.md 优先） |
| Langium 冻结 | v0.6.1 PR-4 | 确定性边界（v0.7.0 切割） |
| @md/ 前缀锁 | v0.6.1 PR-2 | 确定性边界（引用格式确定） |
| External inline 基础设施（75%） | alpha.1 编译器 + CLI + 状态管理 | 确定性边界（外部引用机制就位） |

### 3.3 待完成内容

#### 3.3.1 确定性边界——三边界框架

| 内容 | Phase | 版本 | 信任链角色 |
|---|---|---|---|
| DRY 修复（ALL_ASSET_KINDS SSOT） | Phase 0 | alpha.2 | 边界类型定义确定 |
| Workflow 改名 + 编译器新建/重写 + 目录迁移 | Phase 0 | alpha.2 | 执行边界表达确定 |
| Blueprint 组合模板 + Work 引用简化 + BirthCert/PlanLock 变更 | Phase 1 | alpha.3 | 组合层隔离确定 |
| External inline + 状态管理 + Library/External 删除 | Phase 2 | alpha.4 | 外部引用收敛确定 |
| ADR 处置 + 文档更新 + changelog | Phase 3 | v0.6.1 release | 决策记录确定 |

#### 3.3.2 确定性验证——A3 修复

| 内容 | 版本 | 信任链角色 |
|---|---|---|
| submit 真正执行 Probe（连接 Work → Kernel verdict） | alpha.5 | OXN 出示的证据是真实验证结果 |
| 移除合成 `{ probe: 'state-machine', passed: true }` 占位符 | alpha.5 | 消除假证据 |
| 接通 `--run-probes` 参数 | alpha.5 | 工程师可控验证触发 |

**现状**：`submitTask` 推送合成 `{ probe: 'state-machine', passed: true }`——从未执行真实 Probe。`--run-probes` 参数被声明但从未读取。`executeProbe`（`Proof/runner.ts`）只被 `oxn proof` CLI 调用，Work 引擎从不调用。

**信任后果**：Engine 的公证权不存在。"OXN Engine 出证明"是谎言——工程师信任的是假证据。

#### 3.3.3 确定性证据——A1 修复

| 内容 | 版本 | 信任链角色 |
|---|---|---|
| finalizeWork 在全路径写 frozen.json（含失败路径） | alpha.6 | 工程师能看到 AI 不可靠的部分 |
| 失败路径 frozen.json 包含 round summary + verdict + boundary violations | alpha.6 | 证据完整性 |

**现状**：`finalizeWork` 只更新 `state.json` 和 trace，不写 `.run/frozen.json`。唯一写 work-level frozen.json 的地方是 `submitTask`（所有 task 通过时的副作用）。失败路径（`finalize --verdict FAILED`）无 frozen.json 产物。

**信任后果**：系统对自己的失败盲眼。Insight 的 `--pipeline` 模式读 frozen.json——失败的工作不可见→Insight 看不到失败→工程师无法从失败中学习→经验积累断裂。

#### 3.3.4 确定性记录——A2 修复

| 内容 | 版本 | 信任链角色 |
|---|---|---|
| 接通 finalizeWorkDomains（Domain proof 评估 + frozen.json 记录） | alpha.7 | OXN 确定性地告知工程师 AI 是否跨越了边界 |
| Domain proof FAIL 时在 frozen.json 中标记"边界违反" | alpha.7 | 证据中包含边界违反记录 |
| 工程师看到证据后决定：调整边界（Asset evolve）或接受（finalize with warning） | alpha.7 | 信任决策权在工程师 |

**现状**：`finalizeWorkDomains`（163 行，两阶段原子写入，Domain proof FAIL 时硬阻断）零调用者。Domain invariant FAIL 时不阻断、不记录——边界违反对工程师不可见。

**信任后果**：OXN 不告知工程师 AI 跨越了边界——证据缺失。注意：A2 不是"阻止 AI 跨越"（AI 自己的概率决策），而是"确定性记录边界违反"让工程师知道。

### 3.4 Release 验收标准

**信任链完整性验收**（不止是技术验收）：

- [ ] `bun test` 全绿（含 A1/A2/A3 修复测试）
- [ ] `bun run typecheck` 通过
- [ ] `bun run lint` 通过
- [ ] `bun scripts/validate-dependencies.ts` 通过
- [ ] A3 验收：submit 后 frozen.json 包含真实 Probe verdict（非合成占位符）
- [ ] A1 验收：finalize --verdict FAILED 时 .run/frozen.json 存在且包含 round summary
- [ ] A2 验收：Domain proof FAIL 时 frozen.json 中有"边界违反"标记
- [ ] 三边界验收：AssetKind = 5 类型（domain/workflow/stack/blueprint/roadmap）
- [ ] ADR-0019 标记 Superseded
- [ ] ADR-0048 标记 Superseded
- [ ] `docs/zh-cn/asset.md §12` 移除 type 字段描述
- [ ] `.changes/0-6-1-three-boundary-blueprint-elevation.md` 写入
- [ ] `.changes/0-6-1-trust-chain-completion.md` 写入
- [ ] git tag `v0.6.1` 打在 release commit 上

---

## 4. v0.7 = 信任链效率层

v0.7 合并原 v0.6.2~v0.6.6 可观测性系列 + 原 v0.7.0~v0.7.2 涌现层。这些功能不是信任闭环的必需项，而是让信任链**运作得更高效**：

| v0.7 功能 | 信任链效率角色 | 原版本号 | 原设计稿 |
|---|---|---|---|
| Daemon 完整化 | 自动化证据收集——工程师不用手动跑 CLI 看证据 | 旧 v0.6.1 | `v0.6.2-daemon-design.md` |
| Insight 自动收集 | 自动识别"AI 频繁跨越的边界"——工程师不用逐个审查 | 旧 v0.6.2 | `v0.6.3-insight-design.md` |
| Insight apply 闭环 | 一键将 Insight 转为 Asset 改进 | 旧 v0.7.0 | — |
| 模式库 + Mermaid 图 | 信任分布可视化——工程师更快理解可靠/不可靠分布 | 旧 v0.7.0 | — |
| Hall v0.5 Vue | 证据的可视化呈现 | 旧 v0.6.5 | `v0.6.6-hall-narrative.md` |
| Token 经济学 | 上下文效率——AI 在 token 预算内获取更多确定性反馈 | 旧 v0.6.3 | `v0.6.4-token-economics.md` |
| Hook 框架 | 扩展验证点——更多维度的确定性验证 | 旧 v0.6.4 | `v0.6.5-hook-framework.md` |

### 4.1 v0.7 版本规划

| 版本 | 主题 | 信任链效率 |
|---|---|---|
| v0.7.0 | Daemon 完整化 + Insight 自动收集 + Hall v0.5 | 信任链自动化：证据自动收集 + 边界违反自动识别 |
| v0.7.1 | Insight apply 闭环 + 模式库 + Mermaid 图 | 信任链可视化：信任分布图 + 一键边界改进 |
| v0.7.2 | Token 经济学 + Hook 框架 + Hall 协同健康度 | 信任链优化：上下文效率 + 验证维度扩展 |

### 4.2 v0.7 依赖关系

```
v0.6.1 (信任链就位)
    │
    ▼
v0.7.0 (Daemon + Insight 自动收集 + Hall v0.5)
    │
    ▼
v0.7.1 (Insight apply 闭环 + 模式库 + Mermaid)
    │
    ▼
v0.7.2 (Token + Hook + Hall 健康度)
```

v0.7.0 是关键路径——提供 Daemon 事件流 + Insight 自动收集基础设施。v0.7.1 和 v0.7.2 在此基础上构建。

### 4.3 v0.7 设计参考

5 份 observability 设计稿保留为 v0.7 设计参考（文件名已重映射，内容保留旧版本号——实际开发时以新版本号为准）：

| 设计稿 | 对应 v0.7 版本 |
|---|---|
| `v0.6.2-daemon-design.md`（原 v0.6.1） | v0.7.0 |
| `v0.6.3-insight-design.md`（原 v0.6.2） | v0.7.0 |
| `v0.6.4-token-economics.md`（原 v0.6.3） | v0.7.2（移除已在 v0.6.1 完成的 Asset Paper 部分） |
| `v0.6.5-hook-framework.md`（原 v0.6.4） | v0.7.2 |
| `v0.6.6-hall-narrative.md`（原 v0.6.5） | v0.7.0/v0.7.1 |

### 4.4 约束

- v0.7.0~v0.7.1：+1 新 npm 依赖（mermaid）
- v0.7.2：0 新依赖
- v0.8 开始引入 registry 相关依赖

---

## 5. v0.8+ 路线图确认

v0.8 外部信息流在 v0.6.1 信任链基础上构建——External inline 基础设施（75%）已在 v0.6.1 就位。

### 5.1 v0.6.1 已部分实现的 v0.8 内容

| v0.8 规划 | v0.6.1 已有 | 剩余 |
|---|---|---|
| External inline 指针声明 | 75%（编译器 + CLI + 状态管理 + 校验） | 实际使用 + Langium 旧语法清理 |
| Probe marketplace | 25%（add/list/fix + sandbox + registry.json） | search/discovery/scoring |
| Skill Registry | 0% | 全部 |
| Asset 知识库 | ~5% | 全部 |
| Cross-project Insight | 0% | 全部 |
| Entropy monitoring | 0% | 全部 |
| Hall WebSocket | 0% | 全部 |

### 5.2 v0.8+ 版本规划

| 版本 | 主题 | 信任链角色 | 时间 | 依赖 |
|---|---|---|---|---|
| v0.8.0 | Skill 远程 Registry + Asset 知识库 | 外部 Skill/Probe 的信任接入 | 2027-02 | v0.7.2 |
| v0.8.1 | Probe 生态市场 + 跨项目 Insight | 信任生态扩展 | 2027-03 | v0.8.0 |
| v0.8.2 | 熵增监测 + Hall WebSocket | 信任链实时监控 | 2027-04 | v0.8.1 |
| v0.9.0 | 自适应 Blueprint + AI Agent 多样性 | 信任链自适应 | 2027-05 | v0.8.2 |
| v0.9.1 | 非线性反馈回路 | 信任链反馈优化 | 2027-06 | v0.9.0 |
| v1.0.0 | CAS 完整化 + Engine 独立发布 | 信任链完整化 | 2027-08 | v0.9.1 |
| v1.0.1 | v1.0 收官 | — | 2027-09 | v1.0.0 |
| v1.x+ | 综合集成 | — | 2027-11+ | v1.0.1 |

---

## 6. 文档更新清单

### 6.1 已标记 Superseded 的文档

| # | 文档 | 操作 | 状态 |
|---|---|---|---|
| 1 | `.openxenon/docs/rfcs/_archive/v0.6.x-roadmap-rfc.md` | 头部标记 Superseded | ✅ 已执行 |
| 2 | `.openxenon/pools/drafts/v0.6.x-observability-roadmap-sprint-plan.md` | 头部标记 Superseded | ✅ 已执行 |
| 3 | `.openxenon/pools/drafts/v0.6.x-observability-roadmap-changelog.md` | 头部标记 Superseded | ✅ 已执行 |

### 6.2 已改名的文件

| # | 旧路径 | 新路径 | 状态 |
|---|---|---|---|
| 4 | `pools/drafts/v0.6.1-daemon-design.md` | `pools/drafts/v0.6.2-daemon-design.md` | ✅ 已执行 |
| 5 | `pools/drafts/v0.6.2-insight-design.md` | `pools/drafts/v0.6.3-insight-design.md` | ✅ 已执行 |
| 6 | `pools/drafts/v0.6.3-token-economics.md` | `pools/drafts/v0.6.4-token-economics.md` | ✅ 已执行 |
| 7 | `pools/drafts/v0.6.4-hook-framework.md` | `pools/drafts/v0.6.5-hook-framework.md` | ✅ 已执行 |
| 8 | `pools/drafts/v0.6.5-hall-narrative.md` | `pools/drafts/v0.6.6-hall-narrative.md` | ✅ 已执行 |

### 6.3 已改名的 changelog 片段

| # | 旧路径 | 新路径 | 状态 |
|---|---|---|---|
| 9 | `.changes/0-6-3-asset-paper.md` | `.changes/0-6-1-asset-paper.md` | ✅ 已执行 |

### 6.4 已修订内容的文档

| # | 文档 | 操作 | 状态 |
|---|---|---|---|
| 10 | `pools/drafts/v0.7-plus-roadmap-overview.md` | 更新 v0.6.x 部分：v0.6.1=最小信任闭环；v0.6.2~v0.6.6 合并入 v0.7 | ✅ 已执行 |
| 11 | `pools/drafts/v0.7-plus-roadmap-system-science-alignment.md` | 更新 4 处版本号引用 | ✅ 已执行 |

### 6.5 已修正的 ADR 状态

| # | 文档 | 操作 | 状态 |
|---|---|---|---|
| 12 | `.openxenon/docs/adrs/INDEX.md` | ADR-0019 状态从 Adopted → Superseded | ✅ 已执行 |

### 6.6 5 份设计稿已加版本重映射头

| # | 文档 | 操作 | 状态 |
|---|---|---|---|
| 13 | `v0.6.2-daemon-design.md` ~ `v0.6.6-hall-narrative.md` | 每份文件顶部加版本重映射说明 | ✅ 已执行 |

### 6.7 待更新（v0.7+ roadmap 需进一步调整）

| # | 文档 | 操作 | 状态 |
|---|---|---|---|
| 14 | `pools/drafts/v0.7-plus-roadmap-overview.md` | 更新 v0.7 合并可观测性 + 涌现层的叙事 | 📝 待执行 |
| 15 | `pools/drafts/v0.7-emergence-changelog.md` | 更新 v0.6.x→v0.7 路径描述 | 📝 待执行 |
| 16 | `pools/drafts/v0.7-plus-roadmap-changelog.md` | 更新 v0.6.x 版本号引用 + v0.7 合并叙事 | 📝 待执行 |

---

## 7. ADR 建议

| ADR | 主题 |
|---|---|
| Superseded v0.6.x-roadmap-rfc | 废弃旧 v0.6.x observability 路线图，基于信任链重新规划 |
| Superseded ADR-0019 | Blueprint Type 范式废弃（由 three-boundary RFC 触发） |
| Superseded ADR-0048 | library/external Asset 类型收敛（由 three-boundary RFC 触发） |
| New: 信任链核心 ADR | OpenXenon 的信任模型——工程师↔OXN↔AI 三方信任拓扑 |
| New: 最小信任闭环 ADR | v0.6.1 scope = 确定性边界 + 确定性验证 + 确定性证据 + 确定性记录 |

---

## 8. 执行计划

| Step | 操作 | 状态 |
|---|---|---|
| 1 | 写本 RFC → `pools/drafts/version-unification-rfc.md` | ✅ 本文（v2.0 重写，信任链叙事） |
| 2 | v0.6.x-roadmap-rfc.md 头部标记 Superseded | ✅ 已执行 |
| 3 | observability sprint plan + changelog 标记 Superseded | ✅ 已执行 |
| 4 | 5 份设计稿 git mv 改名 | ✅ 已执行 |
| 5 | `changes/0-6-3-asset-paper.md` → `changes/0-6-1-asset-paper.md` 改名 | ✅ 已执行 |
| 6 | ADR-0019 在 INDEX.md 中状态修正 | ✅ 已执行 |
| 7 | v0.7+ overview/science-alignment 更新引用 | ✅ 已执行 |
| 8 | 5 份设计稿加版本重映射头 | ✅ 已执行 |
| 9 | v0.7+ roadmap overview 进一步调整合并叙事 | 📝 待执行 |
| 10 | v0.7-emergence-changelog 更新路径描述 | 📝 待执行 |
| 11 | v0.7-plus-roadmap-changelog 更新 | 📝 待执行 |

---

## 参考

- [v0.6.x Roadmap RFC（已被 Superseded）](../../docs/rfcs/_archive/v0.6.x-roadmap-rfc.md)
- [三边界框架 RFC](./three-boundary-blueprint-elevation-rfc.md)
- [v0.7+ Roadmap Overview](./v0.7-plus-roadmap-overview.md)
- [ADR-0019 Blueprint Type 范式（已被 Superseded）](../../docs/adrs/0019-blueprint-type-paradigm.md)
- [ADR-0048 library/external 子目录（将被 Superseded）](../../docs/adrs/0048-asset-library-external-scheme.md)
- [2026-07-09 Work 闭环清理草案](./2026-07-09-v0.7-work-closed-loop-and-cleanup.md) — A1/A2/A3 缺口详细分析
