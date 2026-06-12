# OpenXenon 产品手册 · SSOT 章节设计

> 日期：2026-06-12 | 状态：定稿

## 一、整体定位

- **根 `README.md`** = 项目 landing page（GitHub 落地页），承载产品定位 + Quickstart + IAP 概念速览，并引导读者进入 docs/
- **`docs/` 下的 introduction.md + 11 章 + `llm-prompt.md` + 3 附录** = **对外唯一权威（SSOT）**。docs/ 下不设 README——introduction.md 就是文档入口。
- 旧 `docs/{core,architecture,reference,guides,design,horizon,changelog}/` 在手册生成期间先做一次备份，等手册内容完成后，再决定旧文件的去留。在手册完成前，旧文件保持原位不动。
- `docs/examples/` 复制自 `src/oxl/examples/works/` 并重写 README
- `docs/llm-prompt.md` 作为 AI 专用入口（Laravel `for/agents` 模式）
- 章节命名不带数字前缀，以左侧导航索引顺序为主
- 不在手册提及 Bun Card 式首页、VSCode 扩展

## 二、最终目录结构

```
根目录
├── README.md                               # 🏠 Landing page（GitHub 落地页，见 §六）

docs/                                       # 对外唯一权威（SSOT）
├── introduction.md                         # 📖 文档入口——Meet OpenXenon
├── quickstart.md                           # 5 分钟跑通 Proof-First
├── core-concepts.md                        # IAP 范式
├── intent.md                               # Intent 轴（工程师主权）——Domain / Blueprint
├── align.md                                # Align 轴（AI 主权）——Work / Task / Part
├── proof.md                                # Proof 轴（OXN 主权）——Probe / Proof / Verdict
├── recipes.md                              # 端到端实战
├── ddd-in-practice.md                      # 业务建模专题
├── cli.md                                  # CLI 参考
├── architecture.md                         # 架构（外行可读版）
├── extending.md                            # 扩展点
├── roadmap.md                              # 路线图与版本
│
├── llm-prompt.md                           # 🟦 AI 专用入口（for/agents）
│
├── glossary.md                             # 附录 A：中英术语表
├── iap-cheatsheet.md                       # 附录 B：三大法则速记卡
├── faq.md                                  # 附录 C：FAQ
│
└── examples/                               # 🟩 实战示例（来自 src/oxl/examples/works/）
    ├── README.md
    ├── onboarding/
    ├── develop-member/
    ├── fix-issue/
    └── explore-dsl/
```

## 三、左侧导航结构

```
🏠 根 README.md           # Landing page（GitHub 落地页）
   ↓
   → 完整文档：docs/

文档（docs/）
├── Introduction          # 📖 文档入口——Meet OpenXenon
├── Quickstart            # 5 分钟跑通——Proof-First：装好 oxn → 抓住一次 AI 假完成

范式与核心概念
├── Core Concepts         # IAP 三轴一图 + 三大主体权力分立 + IAP 第一法则

IAP 三轴
├── Intent                # Intent 轴（工程师主权）——Domain / Blueprint 成为可执行资产
├── Align                 # Align 轴（AI 主权）——Work / Task / Part 编排与 Skill 契约
├── Proof                 # Proof 轴（OXN 主权）——Probe 声明 → frozen.json → 逃逸机制

实战
├── Recipes               # 5 个端到端 Recipe：单文件验证 → 团队协作工作流
├── DDD in Practice       # 何时升级 Business Domain，CI 门控怎么写

参考
├── CLI                   # oxn 命令族总览 + 退出码 + JSON 协议 + 错误码速查
├── Architecture          # OXN Engine = DSL + Runtime + CLI；Kernel/Infra/Daemon
├── Extending             # 自定义 Probe / Part / DSL 扩展点
├── Roadmap               # P0-P3 路线图 + 自举验证 + 版本与社区

附录
├── Glossary              # 中英对照术语表
├── IAP Cheatsheet        # 三大法则速记卡（一页可打印）
└── FAQ                   # 常见问题

🟦 AI 入口
└── llm-prompt.md         # AI 模型专用入口（人类读者请忽略）
```

## 四、12 章一句话价值主张

| 章名 | 一句话价值主张 |
|---|---|
| Introduction | 介绍 OpenXenon 是什么、解决什么问题、4 类读者 5 分钟路径 |
| Quickstart | 5 分钟跑通 Proof-First：装好 `oxn` → 抓住一次 AI 假完成 |
| Core Concepts | IAP 三轴一图 + 三大主体权力分立 + IAP 第一法则 |
| Intent | Domain / Blueprint 让"业务词典"与"技术图纸"成为可执行资产 |
| Align | AI 在 Blueprint slot 边界内编排 Work/Task/Part；Skill 协议契约 |
| Proof | Probe 声明验收标准 → OXN 产出不可篡改 frozen.json → 逃逸机制 |
| Recipes | 5 个端到端 Recipe：从单文件验证到团队协作工作流 |
| DDD in Practice | 何时从 Program Domain 升级到 Business Domain，CI 门控怎么写 |
| CLI | `oxn` 命令族总览 + 退出码语义 + JSON 协议 + 错误码速查 |
| Architecture | OXN Engine = DSL + Runtime + CLI；Kernel/Infra/Daemon 三模块 |
| Extending | 自定义 Probe / Part / DSL 扩展点 / 私有 Builtin |
| Roadmap | P0-P3 路线图 + 自举验证四级别 + 版本与社区 |

## 五、每章统一模板

```markdown
# <章名>
> 一句话价值主张（出现在 README 路径图与社交分享卡片）

## What —— 是什么
（一段话 + 一张图）

## Why —— 为什么这样设计
（IAP 第一法则、信息隐藏原则等设计动因）

## How —— 怎么用
（最小可运行示例：CLI 命令 + 预期输出 + frozen.json 片段）

## → 参考
（跨章跳转链接）
```

## 六、根 README.md 设计（Landing Page）

v0.1.0 起步阶段，根 README 承担 landing page 角色——在 GitHub / npm 页面上需要自包含"是什么、为什么、怎么跑"。设计意图是按阅读顺序让读者在 2 分钟内完成"知道 → 理解 → 动手"三步。

### 根 README.md 草稿

```markdown
# OpenXenon

> 工程师定义意图，AI 执行对齐，OXN 证明结果。
> Proof 的结果反馈驱动 Intent 演化，IAP 形成闭环，让 Token 成为有效投入。

## 解决什么问题

当前 AI 模型在长上下文、长时间推理后，会漂移重点并陷入自我推理满足。由此带来三个核心问题：
1. 如何**验证** AI 的执行结果，而非盲目信任？
2. 如何让 AI 减少长上下文依赖，保持**高效推理**与对齐？
3. 如何降低 AI 陷入无效推理引起的 **Token 无用消耗**？

## IAP 范式（三句话）

| 轴 | 主导者 | 职责 |
|---|---|---|
| Intent | 工程师 | Domain 锁定业务语言，Blueprint 锁定技术拓扑 |
| Align  | AI      | 在 Blueprint slot 边界内编排 Work → Task → Part |
| Proof  | OXN     | 独立产出不可篡改的 frozen.json，Probe 验收 |

> **IAP 第一法则**：主导权不交叉，证明不可绕过。

## 5 分钟 Quickstart（Proof-First）

```bash
git clone https://github.com/anomalyco/openxenon.git && cd openxenon
bun install --frozen-lockfile && bun run build
./dist/oxn init

# 创建第一个 Proof
./dist/oxn proof create check-deploy
./dist/oxn proof probe add fs-exists --target ./dist/index.js
./dist/oxn proof run check-deploy
# → Verdict: PASS  ← AI 假完成被抓住了？或者 → Verdict: FAIL
```

## 进阶：升级到完整 IAP

```bash
./dist/oxn domain create MemberContext
./dist/oxn blueprint create onboarding --domain MemberContext
./dist/oxn work create --name onboarding
./dist/oxn work add-task --work-name onboarding --task-name register \
  --blueprint onboarding --domain MemberContext
```

## 文档

→ **[完整文档：docs/](docs/)**

## License

[MIT](LICENSE)
```

### 设计要点

- **格式紧凑**：约 60 行，一屏可读完。不展开概念细节，不写架构，不写路线图。
- **Proof-First 先行**：Quickstart 部分直接展示 `oxn proof` 命令流——这是最核心的使用场景，也是最直观的"为什么需要 OpenXenon"的演示。
- **进阶部分仅作预览**：Domain/Blueprint/Work 的完整流程一行带过，不进入细节——真正的内容在 docs/。
- **文档跳转显眼**：→ `docs/` 是标志性的跳转动作，把读者从 landing page 送入完整 SSOT。

### 六-A、`docs/introduction.md` 作为文档入口

`docs/` 不设 README。`introduction.md` 承担文档入口角色：

```markdown
# Introduction

> OpenXenon 是工程师与 AI 协作工作台。
> 工程师定义意图，AI 执行对齐，OXN 证明结果。

## What is OpenXenon

（产品定位：2-3 段讲清楚 OXN Engine、IAP 范式、三大模块）

## 解决的问题

（展开 trhee 核心问题，与根 README 呼应但更详细）

## IAP 范式速览

（IAP 三轴一图 + 三大主体权力分立速查）

## 选择你的学习路径

| 如果你是... | 请读 | 用时 |
|---|---|---|
| **评估者 / 决策者** | Introduction → Core Concepts | 15 min |
| **业务开发者** | Quickstart → Recipes → DDD in Practice | 1–2 h |
| **AI 集成方** | llm-prompt → Align → CLI | 30 min |
| **贡献者** | Architecture → Extending | 2–3 h |

> 🟦 **如果你正在读这份文档的是 AI 模型**：请直接读 [llm-prompt.md](./llm-prompt.md)。
```

### 根 README vs introduction.md 的分工

| | 根 README.md | docs/introduction.md |
|---|---|---|
| **读者场景** | GitHub 落地页、npm 页面、社交分享 | 已经进入文档站、左侧导航可见 |
| **长度** | ~60 行，一屏 | ~120 行 |
| **Quickstart** | ✅ 有（Proof-First 命令流） | ❌ 不重复，跳 Quickstart 章 |
| **学习路径** | ❌ 没有（只有"→ 完整文档"） | ✅ 4 类读者路径表格 |
| **IAP 概念** | 三句话表格 | 详细展开三轴 |
| **作用** | 吸引 + 体验 → 送进 docs | 承接 + 分岔 → 送入对应章节 |

## 七、`llm-prompt.md` 入口页（AI 专用）结构

- 页首醒目标注 `⚠️ FOR AI AGENTS ONLY` + 跳回人类入口
- 内容：你是谁 → 必读章节 → CLI 白名单 → 禁用操作 → 失败时怎么读 frozen.json → 输出格式约束
- 对应 Laravel `for/agents` 模式

```markdown
# llm-prompt

> ⚠️ **FOR AI AGENTS ONLY**
> 人类读者请从根 [README.md](../README.md) 入口，或 docs/ 下的 [introduction.md](./introduction.md) 入口。

## 你是谁
你正在协助一名 OpenXenon 工程师。OpenXenon 是一个"工程师 + AI"协作工作台，核心范式是 IAP（Intent-Align-Proof），核心引擎叫 OXN。

## 必读章节
1. **Core Concepts** — 必读，理解 IAP 三轴
2. **Quickstart** — 看一次，但不要复现
3. **Align** — AI 协作协议
4. **CLI** — CLI 白名单

## CLI 白名单
✅ 允许调用：
- `oxn proof create|probe add|run|list|show`
- `oxn work context|create|add-task|run|submit|status|validate|list-tasks|task-status|task-edit`
- `oxn blueprint create|validate|list`
- `oxn domain create|validate|list`
- `oxn dev compile|unpack|validate|migrate-yaml|promote`

❌ 禁止：
- 直接读/写 `.openxenon/proofs/*/frozen.json`
- 直接读/写 `.openxenon/works/*/state.json`
- 修改 Domain 术语或 Blueprint 规则
- 使用 `--force` 绕过 Proof

## 工作流
1. `oxn work context --work <w> --task <t> --json` 获取上下文
2. 严格遵守 `allowedLanguage`（必须用 term、避开 ban）
3. 按 `taskParts` 顺序写代码
4. 每个 part 完成后 `oxn work submit --work <w> --task <t> --json`
5. 读 `frozen.json` 中的 verdict 决定下一步

## 失败处理
- Verdict PASS → 进入下一 part
- Verdict FAIL → 读 frozen.json 的 expected/actual，修复后重跑
- IAPError → → CLI §错误码速查

## 输出格式
- 代码改动引用 `file_path:line_number`
- 完成状态附 `oxn work status --json` 输出
```

## 八、文件级内容来源映射

| 旧文件 | 新归属 |
|---|---|
| 根 `README.md` | 重写为 landing page（见 §六） |
| `docs/core/document.md`（589 行） | `core-concepts.md` + `intent.md` + `align.md` + `proof.md` + `roadmap.md` + `glossary.md` |
| `docs/core/iap-error-codes.md` | `cli.md` 错误码一节 + `faq.md` |
| `docs/architecture/blueprint.md` | `intent.md` Blueprint 一节 |
| `docs/architecture/domain.md` | `intent.md` Domain 一节 |
| `docs/architecture/state.md` | `proof.md` frozen.json 契约一节 |
| `docs/architecture/work-and-task.md` | `align.md` Work/Task/Part 一节 |
| `docs/architecture/work-mode.md`（801 行） | `align.md` + `ddd-in-practice.md`（**必须拆分**） |
| `docs/architecture/git-workflow-workspace.md` | `recipes.md` §团队协作 + `intent.md` §目录布局 |
| `docs/architecture/l0-l3-constitution.md`（390 行） | `architecture.md`（外行可读版重写） |
| `docs/architecture/adr/012` `013` | 保留为 ADR，不进手册 |
| `docs/reference/cli-reference.md` | `cli.md` |
| `docs/reference/oxn-dsl.md` | `intent.md` Blueprint 语法 + `extending.md` DSL 扩展 |
| `docs/reference/probe-types.md`（415 行） | `proof.md` Probe 概念 + `extending.md` 自定义 Probe |
| `docs/reference/state-schema.md` | `proof.md` frozen.json 结构 |
| `docs/guides/getting-started.md` | `quickstart.md` |
| `docs/guides/ddd-workflow.md` | `ddd-in-practice.md` |
| `docs/guides/probe-development.md` | `extending.md` 自定义 Probe 一节 |
| `docs/guides/troubleshooting.md` | `cli.md` 错误码 + `faq.md` |
| `docs/design/install-skill-v1.md` | `align.md` Skill 协议一节 |
| `docs/horizon/iap-as-signal-system.md` | `roadmap.md` P0-P3 一节 |
| `docs/changelog/CHANGELOG.md` | 保留为 `docs/changelog/`（不在手册内） |
| `docs/{en,zh-cn}/changelog/` | 保留原位 |
| `src/oxl/examples/works/*` | `docs/examples/*` 复制并重写 README |
| `.opencode/skills/oxn-cli` 等 | `align.md` Skill 协议 + `llm-prompt.md` |
| `AGENTS.md` | 简化为工程规范，移除文档 SSOT 部分 |

## 九、内容去重清单

| 散落点 | 归并到 |
|---|---|
| IAP 范式（`document.md` §1-2 + `work-mode.md` §1-2 + README §6） | **Core Concepts** 唯一权威 |
| Proof-First 入口（README §4 + `document.md` §4.3 + `getting-started.md` §4） | **Quickstart** 唯一权威 |
| CLI 命令（`cli-reference.md` 190 行 + `getting-started.md` 8 步流程 + `iap-error-codes.md` 错误码） | **CLI** 唯一权威，其他处只引命令名 |
| 概念速查表（`document.md` §5 + README §1 + `AGENTS.md`） | **Glossary** 唯一权威 |
| L0-L3 架构（README §7 + `document.md` §2.4-2.6 + `l0-l3-constitution.md` 390 行） | **Architecture** 唯一权威（外行可读版重写） |
| Roadmap（README §8 + `document.md` §4.2 + `iap-as-signal-system.md`） | **Roadmap** 唯一权威 |
| Probe 类型（`probe-types.md` 415 行 + `oxn-dsl.md` probe 块 + `document.md` §2.2.3） | **Proof** 概念 + **Extending** 实现 |

## 十、SSOT 维护规则

手册完成后在 `AGENTS.md` 中新增：

```markdown
## 文档 SSOT 规则
- `docs/` 根平铺的 12 章 + 附录是**对外 SSOT**
- 新增概念 / 命令 / Probe：先在 `docs/` 找到归属章节，若没有则新建
- 跨章跳转用相对路径 + 锚链：`../align.md#work-task-part`
- AI 协作者使用 `docs/llm-prompt.md` 作为入口
- 章内统一模板：What → Why → How → 参考
```

## 十一、落地节奏

| 阶段 | 产出 | 估时 |
|---|---|---|
| **M0 目录搭建** | 旧 docs 备份（暂不移动；先做一次 `cp -r docs docs-bak-2026-06`）；新建 12 章 + llm-prompt + 3 附录 + examples/ 占位文件 | 2 天 |
| **M1 入口与概念层** | 根 `README.md` 重写（landing page） + `llm-prompt.md` + Introduction + Quickstart + Core Concepts | 1.5 周 |
| **M2 IAP 三轴** | Intent + Align + Proof（Intent/Align/Proof 三层的完整概念 + 实战指南） | 2 周 |
| **M3 实战层** | Recipes（5 个端到端案例 + `docs/examples/` 4 个 README）+ DDD in Practice | 2 周 |
| **M4 参考层** | CLI + Architecture + Extending + Roadmap | 2 周 |
| **M5 附录与校对** | 3 附录成稿 + 内链校对 + 命令实测 | 1.5 周 |
| **M6 收尾** | `AGENTS.md` 更新 + 根 `README.md` 最终校对 + 旧 docs/ 目录处理决策 | 0.5 周 |

**总计**：约 10 周全量交付。

## 十二、参考站点借鉴

| 参考站 | 借鉴的设计决策 |
|---|---|
| **Vue.js** | "选择你的学习路径"作为 Introduction 最后一节；侧边栏按"开始/基础/深入/进阶"分层而非按文件类型 |
| **Laravel** | "Meet Laravel"放在 Installation 顶部（先 Why 再 How）；`for/agents` 独立入口作为 AI 协议页 |
| **Nanobot** | 极简左侧栏 + 单层平铺，章节不超过 3 层——避免当前 `document.md` 589 行 / `work-mode.md` 801 行的"长文"反模式 |

## 十三、未决事项

- [ ] 旧 `docs/` 目录在手册完成后的最终去留（当前策略：手册完成前不动，完成后统一处理）
- [ ] `docs/_archive/` 是否保留还是直接删除（取决于旧文件是否有外部引用）
- [ ] 英文版翻译时间窗口（当前只在 M7 预留 2 周，具体日期待产品节奏确定）
- [ ] 站点生成器选型（MkDocs / VitePress / Docusaurus）及搜索索引配置（不在本方案范围，独立决策）
