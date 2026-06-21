# L0–L3 架构兼容性与 mdast 接入方案

> **日期**：2026-06-20
> **状态**：初稿
> **目的**：验证 mdast 替代 Langium 后，OpenXenon 的 L0–L3 硬性规则是否仍然成立

---

## 0. L0–L3 架构护身咒回顾（AGENTS.md）

| 层 | 路径 | 禁止导入 |
|---|---|---|
| **L0-Schema** | `src/kernel/schemas/` | 其他所有层 |
| **L0-Contract** | `src/kernel/contracts/` | L0-Processor、L1、L2、L3 |
| **L0-Processor** | `src/kernel/{processors,probes,enums.ts}` | L1+（Kernel 是"兰姆达真空"：禁止 fs/net/child_process/process.env/process.std*/EventEmitter）|
| **L1-Infra** | `src/infra/` | L0-Processor、L2-Work、L3 |
| **L1-OXL** | `src/oxl/`（排除 `generated/`）| L0-Processor、L2-Work、L3 |
| **L2-Builtin** | `src/builtin/` | L2-Work、L3 |
| **L2-Work** | `src/work/` | L3 |
| **L3** | `src/{cli,daemon,hall,skills,watcher,core,i18n}/` | — |

**关键不变量**：
- Kernel 不知 fs/net/child_process
- daemon↔cli 只通过 Unix Socket
- L1-Infra 与 L0-Processor 严格分层

---

## 1. mdast 接入 L0–L3 后的层归属

### 1.1 触达分析

| 路线 C 触达 | 层 | 兼容性 |
|---|---|---|
| `src/oxl/md-bridge/remark-to-kernel.ts`（新）| L1-OXL | **新增** —— mdast 解析器入口 |
| `src/oxl/schemas/oxn-assembly.schema.ts`（重写）| L0-Schema | 兼容（Zod 不感知上游）|
| `src/oxl/validators/*.ts`（重写）| L1-OXL | 兼容 |
| `src/oxl/builtin/`（14 probe 模板）| L2-Builtin | 兼容（物理迁移 .oxn → .md）|
| `src/infra/frozen/`（frozen.json → verdict.md）| L1-Infra | 兼容 |
| `src/oxl/generated/ast.ts`（Langium AST → 5 类 E_MD_xxx + mdast）| L1-OXL | **删除/重写** |
| `src/oxl/langium/oxn.langium` | L1-OXL | **删除**（阶段 5 末期）|
| `src/builtin/probes/*.ts`（14 probe 消费 mdast）| L0-Processor | **写 adapter** |
| `src/cli/index.ts`（detect .md 入口）| L3 | 兼容 |
| `src/daemon/*` | L3 | 兼容 |

### 1.2 兼容性逐层分析

#### L0-Schema

| 触达 | 兼容性 |
|---|---|
| `oxn-assembly.schema.ts` 重写 | ✅ 兼容（Zod schema 不感知上游是 Langium 还是 mdast）|

**理由**：Zod 验证的是数据结构，不是数据来源。

#### L0-Contract

| 触达 | 兼容性 |
|---|---|
| `name-canonical.ts` | ✅ 兼容（仍是字符串处理函数）|
| `io-primitive.ts` | ✅ 兼容 |
| 域特定契约（如 `assertNameFileConsistent`）| ✅ 兼容（输入从 AST 节点变为 mdast 节点，但契约逻辑不变）|

#### L0-Processor（最关键）

| 触达 | 兼容性 |
|---|---|
| 14 builtin probe 函数 | ⚠️ **写 adapter** |
| 验证函数（topologicalSort、evaluatePredicate）| ✅ 兼容（纯函数）|

**adapter 模式**：

```ts
// L0-Processor probe 函数不变
export async function executeFsSize(kernel: KernelSchema): Promise<Verdict> {
  const size = await readFileSize(kernel.path);
  return { status: 'PASS', actual: size, expected: kernel.expected };
}

// L1-OXL mdast 解析器把 .md → KernelSchema
// KernelSchema 与 v0.2 兼容（Zod 验证不感知）
```

**关键不变量**：
- L0-Processor 仍不导入 fs/net/child_process
- fs 操作走 `L1-Infra/filesystem-async.ts`（adapter）
- `kernel` 参数类型不变（仍是 `KernelSchema`）

#### L1-Infra

| 触达 | 兼容性 |
|---|---|
| `src/infra/filesystem-async.ts` | ✅ 兼容（仍为 .md 文件 IO）|
| `src/infra/frozen/` | ⚠️ 重写为 `.openxenon/proofs/` MD 格式 |

**verdict.md 格式**（替代 frozen.json）：

```json
// frozen.json (v0.2)
{
  "name": "auth-impl",
  "verdict": "PASSED",
  "interferenceFlags": [],
  "probes": [...]
}
```

```markdown
<!-- verdict.md (v0.3) -->
---
name: auth-impl
verdict: PASSED                # PASSED | FAILED | INCONCLUSIVE
frozenAt: 2026-07-15T10:30:00Z
contentHash: sha256:abc123...
---

# Verdict: auth-impl

## Probes
| probe | verdict | actual | flag |
| :--- | :--- | :--- | :--- |
| fs-exists | PASS | `/path/to/auth.md` | - |
...
```

**frozen 不变量保留**：
- 写权限：chmod 0o444
- contentHash 校验
- 不可改

#### L1-OXL（核心改造层）

| 触达 | 兼容性 |
|---|---|
| `src/oxl/md-bridge/remark-to-kernel.ts`（新）| ✅ 兼容（属于 L1-OXL）|
| `src/oxl/schemas/oxn-assembly.schema.ts`（重写）| ✅ 兼容 |
| `src/oxl/validators/*.ts`（重写）| ✅ 兼容 |
| `src/oxl/langium/oxn.langium` | 🗑 删除（阶段 5 末期）|
| `src/oxl/generated/ast.ts` | 🗑 删除（自动生成）|

**关键改动**：
- `src/oxl/md-bridge/` 是 L1-OXL 的新子目录
- 解析入口：`.md` → `mdast` → `KernelSchema` (Zod 验证)
- 不引入 fs 直引（走 `L1-Infra/filesystem-async.ts`）

#### L2-Builtin

| 触达 | 兼容性 |
|---|---|
| `src/builtin/probes/*.oxn` 14 个模板 | ⚠️ 迁移为 `.md` |
| `src/builtin/blueprints/*.oxn` | ⚠️ 迁移为 `.md` |
| `src/builtin/parts/*.oxn` | ⚠️ 迁移为 `.md` |

**迁移格式**：

```oxl
// v0.2 builtin/probes/fs-exists.oxn
probe "fs-exists" {
  scheme: "fs://..."
  description = "..."
  props = { path: { type: "string" } }
  output = { exists: { type: "boolean" } }
}
```

```markdown
<!-- v0.3 builtin/probes/fs-exists.md -->
---
name: fs-exists
version: 0.3.0
type: probe
scheme: fs://...
---

# Probe: fs-exists

> 检查路径是否存在

## Props

| name | type | required | default | desc |
| :--- | :--- | :--- | :--- | :--- |
| path | string | yes | - | 文件路径 |

## Output

| name | type | desc |
| :--- | :--- | :--- |
| exists | boolean | true = 存在 |
| isSymlink | boolean | true = symlink |

:::intent{#fs-exists-invariant-1 type="invariant" scope="probe"}
- path 必须存在
- path 必须是绝对路径或 cwd 相对
:::
```

**关键变化**：
- 模板从 .oxn 改为 .md
- `:::intent` 块表达约束
- AI/人类都能读
- L2-Builtin 不变（仍是 builtin 资产目录）

#### L2-Work

| 触达 | 兼容性 |
|---|---|
| `src/work/*` | ✅ 兼容（消费 KernelSchema，不感知上游）|

#### L3

| 触达 | 兼容性 |
|---|---|
| `src/cli/index.ts`（detect .md）| ✅ 兼容（扩展名 detect）|
| `src/cli/domain --md`（新）| ✅ 兼容（新增子命令）|
| `src/cli/proof --md`（新）| ✅ 兼容 |
| `src/daemon/*` | ✅ 兼容（不感知上游）|
| `src/skills/locales/{zh-CN,en}/*` | ✅ 兼容（仍是 MD 资源）|

---

## 2. 5 类 E_MD_xxx 错误校验（继承自路线 A）

L1-OXL 必须提供的 5 类硬结构保护（继承自路线 A 设计）：

| 错误码 | 触发 | 位置 |
|---|---|---|
| `E_MD_MULTIPLE_H1` | 多个 `# Domain` 标题 | mdast heading 节点 |
| `E_MD_ORPHAN_H2` | `## Term` 无父 `# Domain` | mdast heading 节点 |
| `E_MD_CROSS_AGGREGATE` | `:::intent` ID 跨 aggregate 引用 | mdast directive 节点 |
| `E_MD_TABLE_OUT_OF_AGGREGATE` | 表格越界 | mdast table 节点 |
| `E_MD_INVARIANT_OUT_OF_SCOPE` | `:::intent` 块在 `# Domain` 外 | mdast directive 节点 |

**关键不变量**：mdast 解析器替代 Langium 后，**强结构保护不能丢**——这是 L1-OXL 的核心职责。

---

## 3. 5 类 E_MD_xxx 与 Langium 等价性

| Langium 保护 | E_MD_xxx 替代 | 实现 |
|---|---|---|
| `'domain' name=STRING '{' ... '}'` 严格语法 | `E_MD_MULTIPLE_H1` | 扫描 mdast，统计 `depth: 1` 节点 |
| `TermBlock: 'term' '{' (terms+=TermDecl)* '}'` | `E_MD_ORPHAN_H2` | 扫描 H2 节点，检查父链 |
| TypeReference 类型校验 | 5 类 E_MD_xxx | mdast + Zod |
| `InvariantDecl: value=STRING \| script=STRING` | `:::` directive 节点类型校验 | mdast directive 节点 + Zod |
| `BanBlock: 'ban' '{' (bans+=STRING)* '}'` | 弃用 | 改用 `:::intent{#id type="ban"}` |

**结论**：5 类 E_MD_xxx 完全覆盖 Langium 的强结构保护能力，且**更可读**（AI/人类都能验证）。

---

## 4. dependency-rules 守卫

### 4.1 新增守卫（scripts/validate-dependencies.ts）

```ts
const NEW_RULES = [
  // L1-OXL md-bridge 不依赖 fs
  {
    pattern: /from\s+['"]node:fs['"]/,
    files: 'src/oxl/md-bridge/**/*.ts',
    forbidden: true,
    message: 'L1-OXL md-bridge 不能直引 fs；走 src/infra/filesystem-async',
  },
  // L1-OXL md-bridge 不依赖 Langium
  {
    pattern: /from\s+['"]langium['"]/,
    files: 'src/oxl/md-bridge/**/*.ts',
    forbidden: true,
    message: 'L1-OXL md-bridge 不能依赖 Langium；路线 C 全栈替代',
  },
];
```

### 4.2 移除守卫（阶段 5）

```ts
// 阶段 5 后：删除以下规则
const REMOVED_RULES = [
  {
    pattern: /from\s+['"]langium['"]/,
    files: 'src/oxl/**/!(*md-bridge)/*.ts',  // 范围缩小
  },
];
```

---

## 5. 阶段落地（v0.3 路线图）

| 阶段 | 触达 L0–L3 的工作 | 状态 |
|---|---|---|
| 0 | 路线 C v2 + 本对齐设计 | 阶段 0 |
| 1 | L1-OXL md-bridge 新建 + L0-Schema 重写 | 阶段 1 |
| 2 | L2-Builtin 14 probe 模板迁移 .oxn → .md | 阶段 2 |
| 3 | 51 forges/ 迁移到 pools/ + 14 builtin probe MD 模板 | 阶段 3 |
| 4 | L0-Schema Zod 同步 + 5 类 E_MD_xxx 校验 | 阶段 4 |
| 5 | L1-OXL 删 Langium 依赖 + L3 CLI detect .md | 阶段 5 |
| 6 | oxn-md CLI 完整化（所有 L3 子命令 --md）| 阶段 6 |

---

## 6. 关键风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| Langium 解析器删除后，oxn-vscode 失效 | 开发者 IDE 体验降级 | 阶段 4 重建基于 remark 的 LSP |
| mdast 解析性能（1MB MD < 500ms）| 大量资产场景慢 | remark + 缓存 |
| `:::intent` 不被 GitHub/Notion 渲染 | PM 体验降级 | 阶段 6 写 oxn-md-renderer |
| 14 builtin probe 重写回归 | T10/T11/T12 透传失败 | 阶段 2 双轨期（.oxn + .md 并存）|
| 5 类 E_MD_xxx 不覆盖所有 Langium 保护 | 强结构保护缺失 | 阶段 4 全量测试覆盖 |

---

## 7. 关键不变量

1. **L0-Processor 仍不依赖 fs** —— 通过 adapter 走 L1-Infra
2. **Kernel Schema 类型不变** —— Zod 验证，14 builtin probe 函数体不变
3. **强结构保护保留** —— 5 类 E_MD_xxx 覆盖 Langium 强约束
4. **frozen 不变量保留** —— verdict.md 仍 chmod 0o444 + contentHash
5. **L3 CLI 入口扩展** —— detect `.md` 扩展名
6. **L1-OXL 解析器位置不变** —— 在 L1-OXL，不下沉到 L0-Processor

---

## 8. 下一步

- [ ] 阶段 0 评审：本设计稿 + md-ssot-system.md v2 + naming-system.md + v0.3.0-roadmap.md
- [ ] 写 `pools/design/req-md-ssot-v0.3.0.md`（MD-SSOT 需求）
- [ ] 写 `pools/design/dev-design-md-ssot-v0.3.0.md`（MD-SSOT 实施设计）
- [ ] 阶段 1 启动：新建 `src/oxl/md-bridge/` + 写 5 类 E_MD_xxx

---

**关联文档**：
- [`md-ssot-system.md`](./md-ssot-system.md)
- [`v0.3.0-roadmap.md`](./v0.3.0-roadmap.md)
- [`naming-system.md`](./naming-system.md)
- [`process-version-iteration-flow.md`](./process-version-iteration-flow.md)
- [`process-forges-deprecation-migration.md`](./process-forges-deprecation-migration.md)
- [AGENTS.md: L0–L3 架构护身咒](../../../../AGENTS.md)
