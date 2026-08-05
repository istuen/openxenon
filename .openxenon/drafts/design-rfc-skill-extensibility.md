# RFC XXXX: Skill 体系扩展性（草案 / v0.6.2 设计草稿）

> **类型**：RFC 草案（design 类 Draft，由 `oxn draft create rfc-skill-extensibility --prefix design` 创建）
> **状态**：active（待通过 `oxn work create --blueprint doc-rfc-workflow` 提升到 `docs/rfc/zh-cn/RFC-XXXX-skill-extensibility.md`）
> **创建**：2026-07-29
> **来源**：oxn-draft Skill 落地时衍生的扩展性议题（Q-D6/Q-D7/Q-D8 grilling 决议）

---

## 摘要

OXN v0.6.2 落地 oxn-draft Skill 后，OXN Skill 体系面临 3 个扩展性议题：

1. **Skill 注册机制硬编码**：`packages/cli/src/skills/loader.ts` 手写 `skillMeta` 和 40 个 `import .md with { type: 'text' }`——新增 Skill 需要改代码 + 重新编译二进制。
2. **Scene 与 Skill 映射不清晰**：当前 3 Skill（oxn-asset / oxn-work / oxn-draft）与 Roadmap 6 scene（doc / dev / debug / test / release / onboard）不是 1:1 映射。
3. **Scene 多 Blueprint 可选引导缺位**：Roadmap scene 列出多个 Blueprint 候选，但 AI 引导逻辑散落在 Skill instruction.md，缺乏系统化结构。

本 RFC 提出 3 项决议（待 v0.7+ 实施），不阻塞 v0.6.2 落地。

---

## 决策要点

### D1：Skill 注册机制变更（v0.7+）

**问题**：当前 Skill 在 `loader.ts` 硬编码（40 个 `import` + `skillMeta` 数组），新增 Skill 需要：
- 改 TypeScript 代码
- 加 `locales/{zh-CN,en}/<skill>/` 目录
- 重新编译二进制（Bun `--compile`）

**提议**：Skill 注册改为**文件系统扫描**：

```
.openxenon/skills/                              ← 项目自定义 Skill（tracked）
├── <custom-prefix-scene>/
│   ├── instruction.md
│   ├── references/
│   └── assets/

src/skills/locales/{zh-CN,en}/oxn-*/            ← OXN 内置 Skill（编译时内嵌）
├── <skill>/
│   ├── instruction.md
│   ├── references/
│   └── assets/
```

`loader.ts` 改为：

```typescript
function loadSkills(): OpenXenonSkill[] {
  return [
    ...scanBuiltinSkills(),    // 编译时内嵌的 oxn-* Skills
    ...scanProjectSkills(),    // .openxenon/skills/ 下的自定义 Skills
  ]
}
```

**前置条件**：Bun 编译时需把 `src/skills/locales/` 内嵌二进制——已有 `with { type: 'text' }` 机制可复用。

**回退**：自定义 Skill 失败时回退到内置 Skill（与 `@oxn/` + `@prj/` 两层机制对齐）。

### D2：Skill 与 Scene 映射策略

**N:M 映射**：当前 3 Skill 已覆盖多 scene：

| Skill | 覆盖 scene |
|---|---|
| oxn-asset | doc / dev（asset 相关） |
| oxn-work | dev / debug / test / onboard |
| oxn-draft | dev / debug / doc（探索性场景） |

**未来扩展**：Scene 增加不一定要拆 Skill，而是看场景复杂度：

- 复杂度高（≥5 个指令变体 / ≥3 个 reference 文件 / 跨多种 Blueprint）→ 拆 Skill
- 复杂度低（≤3 个指令变体 / 0-1 reference 文件）→ 合并到现有 Skill

**判据**：用 Skill `description` 字段的字数 + `references[]` 长度作为拆分信号。

### D3：Scene 多 Blueprint 可选引导

**现状**：Roadmap scene 是静态表格，列出多个 Blueprint 候选。AI 通过 `oxn roadmap suggest --goal --scene` 排序匹配后**人工选择**。

**问题**：Skill instruction.md 缺少"如果场景 X，优先选 Blueprint Y"的结构化引导。

**提议**：Skill instruction.md 加 **Blueprint 选择树段**：

```markdown
## Blueprint 选择树

### 场景：fix-issue
1. 检测是否是 frozen.json 异常 → blueprint: fix-issue-workflow（待实现）
2. 检测是否是 build/test 失败 → blueprint: dev-workflow
3. 默认回退 → blueprint: dev-workflow + debug 引导
```

**实施时机**：v0.7+ 与 Scene 重新设计同步。

### D4：安装与分发机制

**现状问题**（v0.6.2 已修复）：
- `install-skill` 默认写到 `~/.opencode/skills/`（全局）—— 错误的历史实现
- v0.6.2 修订：默认项目级，加 `--global` 才写到全局

**未来**：考虑 `oxn skill install <id> --from <source>` 支持从外部源（npm 包 / GitHub 仓库）安装 Skill。

---

## 影响范围

| 维度 | 影响 |
|---|---|
| **代码** | `loader.ts`（重写扫描逻辑）+ `install-skill.ts`（已支持 `--global`）+ `init.ts`（已支持 `--global`） |
| **数据** | Skill SSOT 从代码内嵌改为文件系统扫描 |
| **CLI** | 新增 `oxn skill create/install/list/archive` 命令族（可选） |
| **i18n** | 新增 Skill description / instruction 翻译机制 |
| **文档** | 更新 AGENTS.md + dev/zh-cn/skill-system.html + docs/rfc/zh-cn/RFC-0011 |
| **测试** | Skill 编译/扫描/分发的 E2E 测试 |

---

## 相关术语

| 术语 | context | 定义 |
|---|---|---|
| `Skill` | OxnCliDomain | OpenXenon Skill = AI Agent 的引导包（instruction + references + assets） |
| `Scene` | OxnProjectDomain | Roadmap scene = AI 工作场景路由 |
| `Blueprint` | OxnAssetDomain | AssetKind 之一，Work 编排模板 |

---

## 相关决策记录

| 编号 | 主题 | 状态 |
|---|---|---|
| RFC-0011 | 内置 Asset 两层机制（`@oxn/` + `@prj/`） | Accepted（meta-RFC） |
| RFC-0012 | 自举种子豁免（meta-RFC） | Accepted |
| RFC-0013 | 版本号政策（Alpha / Version Fragment） | Accepted |
| 本 RFC | Skill 体系扩展性 | Draft |

---

## 推迟 / 不在本 RFC 范围

- Skill 商店（oxn skill install @pkg/name）—— 留待 v0.8+
- Skill 版本管理 —— 与 Asset 版本管理对齐
- Skill 自动更新 —— 留待 v0.8+

---

## 实施路径（v0.7+ 计划）

```
v0.7.0 Phase 1: Skill 注册机制改造
  - loader.ts 改为文件系统扫描
  - .openxenon/skills/ 项目自定义 Skill 支持
  - 保留 OXN 内置 Skill 编译时内嵌

v0.7.0 Phase 2: Scene 重新设计
  - Roadmap scene 增加 scene 字段（与 Domain 关联）
  - Skill 与 Scene 映射 N:M 策略正式落地
  - Blueprint 选择树段在 Skill instruction.md 中

v0.7.0 Phase 3: Skill 生命周期 CLI
  - oxn skill create/install/list/archive
  - 与 oxn draft 类似的 4 命令最小生命周期
```

---

> 📌 本文件是 design 类 Draft，用 `oxn draft create --prefix design` 创建。
> 提升路径：`oxn work create rfc-skill-extensibility --blueprint doc-rfc-workflow`。
> 由 doc-rfc-workflow 的 gather slot 从 `.openxenon/drafts/` 收集 → 提升到 `docs/rfc/zh-cn/RFC-XXXX-skill-extensibility.md`。