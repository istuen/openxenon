# MD as Canonical & mdast 替代 Langium —— 路线 C 远期愿景设计稿

> **日期**：2026-06-18
> **状态**：路线 C 远期愿景（v0.4+ 启动；非 v0.2/v0.3 立即行动）
> **前置（必读）**：
> - [`2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md`](./2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md) — Domain 作为 SSOT + 文档绑定 + Skills 重构
> - [`2026-06-18-md-as-friendly-view-spike-design.md`](./2026-06-18-md-as-friendly-view-spike-design.md) — **DEPRECATED**：路线 A spike（已被路线 C 取代）
> - [`2026-06-18-ddd-terms-decouple-oxl-grammar-design.md`](./2026-06-18-ddd-terms-decouple-oxl-grammar-design.md) — **DEPRECATED**：路线 B OXL 语法解耦（已被路线 C 取代）
> **本稿价值**：在路线 A + B 已被废弃的背景下，**记录"unified + remark + mdast 全栈替代 Langium"的终局方向**。这是一次**架构终局**的宣言——从"OXL 是 DSL、Langium 是解析器"转向"OXL 是带强约束的 MD、unified 是解析生态"。

---

## 0. 元信息

- **作者**：opencode（基于 `docs_tmp/md-unified-1.md` 5 轮 AI 讨论 + 用户战略决策 + 源码事实核对）
- **目标读者**：架构师 + OXN 维护者
- **关键决策（已与用户确认）**：
  - **采纳本讨论为终局方向**（路线 C）
  - **路线 A + B 标记 deprecated 保留**（历史完整，不沉没成本）
  - **路线 C 启动时间**：v0.2.0 冻结后
  - **双轨期策略**：.oxn + .md 并存
  - **14 builtin probe 适配**：渐进替换
  - **Langium 依赖**：双轨期保留，阶段 5 移除
  - **oxn-vscode 扩展**：路线 C 阶段 4 重建
  - **T10/T11/T12 done 任务**：标记 deprecated
  - **14 资产迁移时机**：阶段 3 全面迁移
  - **v0.2.0 状态**：按原计划冻结
- **影响路径（v0.4+ 启动时）**：
  - 新增：`src/oxl/md-bridge/remark-to-kernel.ts`（L1-OXL）
  - 新增：`.openxenon/domains/*.md`（双轨期）
  - 改造：`src/oxl/builtin/probes/`（14 probe 渐进重写）
  - 改造：`oxn-vscode/` 扩展
  - 移除：`src/oxl/langium/oxn.langium`（阶段 5 末期）

---

## 1. What：命题与 5 轮 Q&A 演进

### 1.1 命题

> OpenXenon 当前 OXL 是基于 Langium 的强结构 DSL。LLM 写自定义 DSL 出错率高，AI 友好度受限。**能否用 `unified + remark + mdast` 全栈替代 Langium，把 OXL 改为"带强约束的 Markdown"？**

### 1.2 5 轮 AI 讨论要点（`docs_tmp/md-unified-1.md`）

| 轮次 | 议题 | 结论 |
|---|---|---|
| 1 | unified / remark / mdast 是什么 | 三者协同：unified=管线底座 / remark=MD 处理器 / mdast=AST 规范 |
| 2 | 三者核心区别 | unified=框架、remark=处理器、mdast=数据规范（基于 unist 扩展） |
| 3 | OpenXenon 改用 MD 作为 OXL | 提议重构：用 unified+remark+mdast 替代 Langium |
| 4 | MD 约束语法定义 | 3 方案对比：①语义标题+列表 ②HTML 注释 ③`:::intent` Container Directives（推荐） |
| 5 | unified 后期 / mdast 替代 Langium / Verdict 输出 | 后期=Stringify（remark-stringify / rehype-stringify）；mdast 完全可替代 Langium；Verdict 双输出 MD + HTML |

### 1.3 4 个核心提议（用户决策全采纳）

| # | 提议 | 采纳 |
|---|---|---|
| 1 | OXL **完全**改用 MD 作为 canonical | ✅ |
| 2 | mdast 替代 Langium 作为 OXL 解析器 | ✅ |
| 3 | `:::intent{#id type="..."}` Container Directives 作为约束语法 | ✅（v0.4+ 启动时采纳） |
| 4 | Verdict 输出为 MD（AI 消费）+ HTML（人类 dashboard） | ✅（**v0.3 主线**实施） |

---

## 2. Why：源码事实核对

下文所有 `file:line` 均经本地仓库核对。

### 2.1 现有 OXL Langium 解析链 5 个关键事实

| 维度 | 现状 |
|---|---|
| **Langium grammar** | `src/oxl/langium/oxn.langium`（322 行；6 个 TopLevelEntity；14+ grammar 规则） |
| **生成的 AST** | `src/oxl/generated/ast.ts`（Langium 自动生成；所有 OXL 节点类型） |
| **Zod schema** | `src/oxl/schemas/oxn-assembly.schema.ts`（与 Langium AST 强绑定） |
| **14 builtin probe** | `src/builtin/probes/`（读 Langium AST；T10/T11/T12 全部依赖） |
| **14 .oxn 资产** | `.openxenon/domains/*.oxn`（14 个；全部基于扁平 term 列表） |

### 2.2 mdast 替代 Langium 的 4 个工程盲点（与 §5 缓解方案对应）

| # | 盲点 | 影响 | 缓解 |
|---|---|---|---|
| 1 | `:::intent` 破坏 MD 纯洁性 | Notion / GitHub 渲染失败 | 写 `oxn-md-renderer` 工具 |
| 2 | mdast 替代 Langium = IR 全失效 | 14 probe + 全部 validator 重写 | 写 remark-to-kernel adapter 兼容层 |
| 3 | L0–L3 边界与 mdast 解析器冲突 | 架构守卫失败 | 阶段 0 评估 |
| 4 | 失去 Langium 强结构保护 | 14 builtin probe 透传测试失效 | 写 5 类 E_MD_xxx 错误校验（继承自路线 A） |

### 2.3 路线 C 与 L0–L3 架构约束的兼容性

| 层 | 路线 C 触达 | 兼容性 |
|---|---|---|
| **L0-Schema** | `src/oxl/schemas/oxn-assembly.schema.ts` 重写 | 兼容（Zod 不感知上游） |
| **L0-Contract** | `src/oxl/contracts/` 调整 | 兼容 |
| **L0-Processor** | 14 builtin probe 重写 | **突破**——需要写 adapter 让 probe 仍消费 Kernel Schema |
| **L1-Infra** | 不变 | 兼容 |
| **L1-OXL** | 新增 `src/oxl/md-bridge/remark-to-kernel.ts` | **突破**——mdast 解析器放 L1-OXL |
| **L2-Builtin** | 14 .md 资产迁移 | 兼容 |
| **L2-Work** | 不变 | 兼容 |
| **L3-CLI/daemon** | CLI 改 detect `.md` 入口 | 兼容 |

**关键不变量**：Kernel（兰姆达真空）不感知上游是 Langium 还是 mdast。Kernel 只认 Kernel Schema 对象。

---

## 3. 路线 A/B/C 三路线对照矩阵

| 维度 | 路线 A (spike, DEPRECATED) | 路线 B (OXL 解耦, DEPRECATED) | 路线 C (本稿, 采纳) |
|---|---|---|---|
| **MD 定位** | Friendly view | Friendly view | **Canonical** |
| **OXL grammar** | 零修改（D4 红线） | 增量（v0.3 mid-term） | **完全废弃** |
| **Langium 角色** | 解析器（核心） | 解析器（核心） | **被 mdast 替代** |
| **MD 约束语法** | 语义 H1/H2 + 表格 + 代码块（标准 MD） | dot-path + `@tag` prefix | `:::intent` Container Directives（RFC 7763） |
| **14 现有资产** | 零迁移 | migration 工具 | **全部失效 + 重新写 .md** |
| **T10/T11/T12 done** | 不破坏 | 跨 done 任务 | **全部失效 → deprecated** |
| **v0.2 兼容** | ✅ 完全保持 | ⚠ v0.3 mid 破坏 | ❌ 不可保持 |
| **启动时机** | 已废弃 | 已废弃 | **v0.2.0 冻结后** |
| **工作量** | 1 周 | 1–2 月 | **17 周 ≈ 4 个月** |
| **依赖新增** | 无 | 无 | `unified` `remark-parse` `remark-directive` `remark-gfm` `unist-util-visit` `mdast-util-to-string` |
| **依赖移除** | 无 | 无 | `langium` 阶段 5 末期移除 |

**关键判断**：路线 A + B 已被路线 C 全栈重写吸收。路线 A 的 D2（5 类结构校验）与路线 B 的 dot-path 寻址部分**继承到路线 C**（见 §6）。

---

## 4. 路线 C 核心架构

### 4.1 完整流水线

```
【输入阶段】
OXL-MD 文本 (人类/AI 编写的约束)
   │
   ▼ (unified + remark-parse + remark-directive)
原始 mdast 树 (with `:::intent` 容器节点)
   │
【核心转换阶段】
   ▼ (remark-to-kernel 自定义插件: 遍历 mdast, 提取 `:::intent` 块)
Kernel Schema 对象 (Zod 验证后)
   │
【核心证明阶段】
   ▼ (Proof Engine: 调度 14 builtin probe)
内存 Verdict (PASS / FAIL / INCONCLUSIVE 三态)
   │
【输出分发阶段】
   ├──> 路径 A: remark-stringify → verdict.md (AI 消费, v0.3 主线实施)
   ├──> 路径 B: remark-rehype → rehype-stringify → verdict.html (人类 dashboard, v0.3 主线)
   └──> 路径 C: frozen.json (物理证明, 不变)
```

### 4.2 关键不变量

1. **Kernel 完全不感知上游**——Kernel 只认 Kernel Schema 对象；mdast → Kernel Schema 转换在外层完成
2. **OXL-MD 是 canonical**——`.oxn` 退化为派生格式；`.md` 是真 SSOT
3. **Proof Engine 复用**——14 builtin probe 仍按 v0.2 T10/T11/T12 设计；只是改读 mdast（渐进替换）
4. **Verdict 三态保留**——frozen.json schema 的 PASS / FAIL / INCONCLUSIVE 不变

### 4.3 与旧架构对比

```
旧 (v0.1.x → v0.2.x):
  OXL 文本 → [Langium Parser] → AST → [oxn-assembly schema] → Kernel Schema → Proof Engine → Verdict

新 (v0.4+ 路线 C):
  OXL-MD 文本 → [unified + remark-parse + remark-directive] → mdast → [remark-to-kernel 插件] → Kernel Schema → Proof Engine → Verdict
```

---

## 5. 3 个 MD 约束语法选项的最终抉择

| 选项 | 描述 | 推荐度 | 路线 C 中是否采纳 |
|---|---|---|---|
| ① | 语义 H2 + 列表（标准 MD） | 自然 | 备选（兼容路线 A） |
| ② | HTML 注释锚点（`<!-- oxn-lock: ... -->`） | 隐式 | 不采纳 |
| ③ | `:::intent{#id type="..."}` Container Directives | 工程化 | **采纳**（路线 C 默认） |

### 5.1 路线 C 采纳 ③ 的理由

```markdown
# Domain: OrderContext

普通业务描述。

:::intent{#order-invariant-1 type="invariant"}
- 订单总价等于各行项目单价乘数量之和
- 订单状态为 SHIPPED 时不得修改 items
:::

:::intent{#order-ban-1 type="ban"}
- 禁止使用 `eval()`
- 禁止引入未审核的第三方加密库
:::

## Term: Order
| 属性 | 说明 |
| :--- | :--- |
| id | 订单唯一标识 |
| status | 生命周期状态 |
```

**优势**：
1. **唯一标识符（ID 锚定）**：`#order-invariant-1` 给每组约束固定 ID；Proof Engine 可做前后快照 Diff
2. **区分度极高**：`:::intent` 块外都是非约束文本；内是强约束
3. **AST 节点独立**：`containerDirective` 节点高内聚，遍历精准
4. **RFC 标准**：基于 unified Generic Directives (RFC 7763)，生态成熟

### 5.2 关键依赖

- `remark-directive` —— 把 `:::name{...}` 语法解析为 `containerDirective` 节点
- `unist-util-visit` —— 遍历 mdast 树
- `mdast-util-to-string` —— 提取文本内容

### 5.3 与 GitHub/Notion 渲染兼容性问题

**问题**：`:::intent` 不是 GitHub/Notion 原生支持；显示为字面文本。
**缓解**：写 `oxn-md-renderer` 工具（阶段 4 实施），把 `:::intent` 块渲染为可视化 UI。

---

## 6. remark-to-kernel 转换插件设计

### 6.1 插件入口

```ts
// src/oxl/md-bridge/remark-to-kernel.ts (L1-OXL)
import { visit } from 'unist-util-visit';
import type { Root, ContainerDirective } from 'mdast';

export function remarkToKernelPlugin() {
  return (tree: Root, file: VFile) => {
    const intentBlocks: IntentBlock[] = [];

    visit(tree, (node) => {
      if (node.type === 'containerDirective' && node.name === 'intent') {
        const { id, type } = node.attributes as { id: string; type: string };
        const text = toString(node);  // 提取块内文本
        intentBlocks.push({ id, type, text });
      }
    });

    file.data.kernel = {
      intents: intentBlocks,
      // ... 其他转换
    };
  };
}
```

### 6.2 5 类 E_MD_xxx 错误校验（继承自路线 A）

| 错误码 | 触发 |
|---|---|
| `E_MD_MULTIPLE_H1` | 多个 `# Domain` 标题 |
| `E_MD_ORPHAN_H2` | `## Term` 无父 `# Domain` |
| `E_MD_CROSS_AGGREGATE` | `:::intent` ID 跨 aggregate 引用 |
| `E_MD_TABLE_OUT_OF_AGGREGATE` | 表格越界 |
| `E_MD_INVARIANT_OUT_OF_SCOPE` | `:::intent` 块在 `# Domain` 外 |

### 6.3 双轨期兼容

阶段 1-3 期间，`.oxn` 与 `.md` 并存：
- `oxn-cli` 扩展名 detect（`.oxn` → 走 Langium；`.md` → 走 unified）
- 写 `oxn domain migrate --to-md` 工具（批量转换）
- `.oxn` 与 `.md` 通过 Kernel Schema 统一消费

---

## 7. 14 builtin probe 渐进替换（阶段 2）

### 7.1 替换顺序

```
阶段 2a (1-2 周): 1-2 个 probe 试点
  └─ 选 fs 系列（如 fs-size, fs-exists）作为 PoC
  └─ 验证 mdast → Kernel Schema → probe 的全链路
  └─ 失败回退到 Langium adapter

阶段 2b (2 周): 5 个 probe 渐进
  └─ fs-*, file-* 等简单 probe
  └─ 累积经验

阶段 2c (2 周): 全部 14 probe 重写
  └─ 涵盖 fs / http / shell / git / new
  └─ T10/T11/T12 done 任务标记 deprecated
```

### 7.2 adapter 模式

```ts
// src/builtin/probes/fs-size.ts (新)
export async function executeFsSize(kernel: KernelSchema): Promise<Verdict> {
  // 旧版读 Langium AST；新版读 Kernel Schema
  // Kernel Schema 不变；只是生成方式从 Langium 改 mdast
  const size = await readFileSize(kernel.path);
  return { status: 'PASS', actual: size, expected: kernel.expected };
}
```

**关键不变量**：probe 函数体不变；只改"如何从 .oxn/.md 提取 Kernel Schema"。

---

## 8. 阶段 3：14 .oxn 资产迁移

### 8.1 migration 工具

```bash
oxn domain migrate --to-md .openxenon/domains/CodeQualityContext.oxn
# 翻译规则:
#   term { "X": "Y" }   →   :::term{#X type="entity"} Y
#   invariant { "..." } →   :::intent{#auto-gen-1 type="invariant"} ...
#   ban { "..." }       →   :::intent{#auto-gen-2 type="ban"} ...
```

### 8.2 双轨期 (阶段 3 期间)

- `.oxn` 与 `.md` 同时存在
- `oxn-cli` 自动 detect
- migration 工具支持 round-trip（`.oxn ↔ .md` 等价性）
- 阶段 5 末期移除 `.oxn`

---

## 9. 阶段 4：oxn-vscode 扩展重建

### 9.1 现状

`oxn-vscode/` 基于 Langium LSP 提供 OXL 语法高亮、补全、跳转。

### 9.2 路线 C 阶段 4 任务

- 用 `unified` 重新实现 OXL-MD 的 syntax highlighting
- 用 `remark` parser 重新实现 LSP
- 保留所有 Langium LSP 行为（补全 / 跳转 / 重命名）
- 阶段 4 之前保留 Langium LSP 不动

---

## 10. Verdict → MD/HTML 双输出（**v0.3 主线**实施）

**重要**：本节与路线 C 解耦——Verdict 输出**不依赖** mdast 替代 Langium，可与路线 A spike 同期实施。

### 10.1 架构

```ts
// src/oxl/verdict/md-output.ts
import { unified } from 'unified';
import remarkStringify from 'remark-stringify';

export function verdictToMd(verdict: Verdict): string {
  const tree = buildVerdictMdast(verdict);  // 构造 mdast
  return unified().use(remarkStringify).stringify(tree);
}

// src/oxl/verdict/html-output.ts
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';

export function verdictToHtml(verdict: Verdict): string {
  const mdast = buildVerdictMdast(verdict);
  return unified()
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync(mdast)
    .toString();
}
```

### 10.2 双输出价值

- `verdict.md` —— AI 消费（下一轮迭代时读取）
- `verdict.html` —— 人类 dashboard（CI/CD artifact）

### 10.3 v0.3 主线实施

- 与路线 A spike 同期或稍晚
- 1-2 周工作量
- 独立 PR，不影响 v0.2 冻结

---

## 11. 路线 C 触发 checklist（v0.4+ 启动前必达）

| # | 条件 | 验证方法 |
|---|---|---|
| 1 | v0.2.0 冻结 + tag | `git tag v0.2.0` |
| 2 | v0.3.0 冻结 + tag（含路线 A + Verdict 输出） | `git tag v0.3.0` |
| 3 | `remark-directive` 依赖评估（与 zero-deps 原则的兼容性） | 走 L0–L3 架构守卫 |
| 4 | 14 资产 migration 工具就绪（阶段 1 阶段完成） | `oxn domain migrate --dry-run` 跑过 |
| 5 | 1-2 builtin probe 试点成功（阶段 2a） | 独立 spike 验证 |
| 6 | oxn-md-renderer 工具就绪 | 阶段 4 阶段完成 |
| 7 | 团队对全栈重写的共识 | 用户决策 |
| 8 | v0.2 全部 T1a–T14 done 任务保留 | git log 核对 |
| 9 | v0.3 spike 验证全绿（D1–D5） | `bun test` |
| 10 | T10/T11/T12 标记 deprecated 但不删除 | git log + 文档说明 |

**任一不满足 → 路线 C 启动延期**。

---

## 12. 阶段划分（5 阶段 17 周 ≈ 4 个月）

```
[阶段 0] 准备期 (1-2 周)
  ├─ 创建路线 C 远期档 forges/ 文档 (本稿)
  ├─ spike: unified 替代 Langium 可行性
  ├─ OXL-MD 语法规范初稿
  ├─ 加依赖 (unified/remark/remark-directive/remark-gfm/unist-util-visit/mdast-util-to-string)
  └─ 创建 feat/v0.4-unified-rewrite 分支

[阶段 1] 基础 (3 周)
  ├─ remark-to-kernel 核心插件
  ├─ 5 类 E_MD_xxx 错误校验
  ├─ OXL-MD 单元测试 50+ case
  └─ OXL-MD 语法规范定稿

[阶段 2] probe 渐进替换 (4 周)
  ├─ 2a: 1-2 probe 试点 (fs-size, fs-exists)
  ├─ 2b: 5 probe 渐进 (fs-*, file-*)
  └─ 2c: 14 probe 全部重写 + T10/T11/T12 deprecated

[阶段 3] 资产迁移 (4 周)
  ├─ oxn domain migrate 工具
  ├─ 14 .oxn 资产 → .md 全面迁移
  ├─ 双轨期 round-trip 测试
  └─ 14 builtin probe 全部读 .md

[阶段 4] 工具 (3 周)
  ├─ oxn-vscode 扩展重建
  ├─ oxn-md-renderer (Notion / GitHub 渲染适配)
  ├─ CLI 工具 (oxn domain --md)
  └─ docs 站点更新

[阶段 5] 收尾 (2 周)
  ├─ 全量测试 + E2E
  ├─ v0.4.0 冻结
  └─ 移除 Langium 依赖 (阶段 5 末期)
```

---

## 13. 风险与缓解

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| 1 | v0.2.0 收尾期与路线 C 启动冲突 | T10/T11/T12 跨 done 任务 | **v0.2.0 必须先冻结**（已硬门槛） |
| 2 | 4 个月工作量超预算 | 路线 C 拖延 | 阶段 0–3 是 MVV；4–5 可分批 |
| 3 | `remark-directive` 与 L0–L3 边界冲突 | 架构守卫失败 | 阶段 0 评估 |
| 4 | 14 资产迁移遗漏 | 现有业务中断 | 阶段 3 强校验 + round-trip 测试 |
| 5 | Langium 移除导致 5 个 PR-B1..B4 失效 | 路线 B 投资清零 | 路线 B 已废弃，无影响 |
| 6 | 路线 A spike 设计稿作废 | 文档沉没成本 | 标记 deprecated 保留（已硬门槛） |
| 7 | AI 不熟悉 `:::intent` 语法 | AI 友好度反降 | 阶段 0 验证（重点） |
| 8 | 现有 CLI 子命令破坏 | CLI 兼容性 | 双轨期保留（已硬门槛） |
| 9 | GitHub/Notion 渲染失败 | PM 体验差 | 阶段 4 写 oxn-md-renderer |
| 10 | 失去 Langium 强结构保护 | 14 builtin probe 透传测试失效 | 5 类 E_MD_xxx 错误校验（继承自路线 A） |

---

## 14. 与其他 forges 文档的关系

### 14.1 业务建模金字塔

```
                    ┌──────────┐
                    │ 路线 C   │  v0.4+ (本稿)
                    │ unified  │
                    │ 全栈重写 │
                    └──────────┘
                  ┌──────────────┐
                  │ 路线 B (DEPRECATED)  │  v0.3 mid-term (废弃)
                  │ OXL 语法解耦 │
                  └──────────────┘
              ┌──────────────────┐
              │ 路线 A (DEPRECATED)  │  spike (废弃)
              │ MD friendly view │
              └──────────────────┘
          ┌──────────────────────────┐
          │ 2026-06-17 Domain SSOT +  │  v0.3 active
          │ 文档绑定                  │
          └──────────────────────────┘
```

### 14.2 文档依赖关系

| 文档 | 状态 | 关系 |
|---|---|---|
| **2026-06-17** (Domain SSOT) | ✅ 活跃 | v0.3 主线；与路线 C 正交可叠加 |
| **2026-06-18 spike** (路线 A) | 🟡 DEPRECATED | 已被路线 C 取代；保留为历史 |
| **2026-06-18 ddd-terms** (路线 B) | 🟡 DEPRECATED | 已被路线 C 取代；保留为历史 |
| **本稿 (路线 C)** | ✅ 远期愿景 | v0.4+ 启动；架构终局方向 |

### 14.3 业务建模四角（终局）

| 维度 | 来源文档 | 状态 |
|---|---|---|
| 业务问题**来源** | 2026-06-13 Intent Pool v3 | 活跃 |
| 业务问题**结构化表达** | 2026-06-17 Domain SSOT | 活跃 |
| 业务问题**写作入口** | 2026-06-18 spike (路线 A) | DEPRECATED |
| 业务问题**语法解耦（终局）** | 本稿 (路线 C) | 远期 |

---

## 15. 未决问题

- [ ] **Q1**：`:::intent` 语法是否需要支持嵌套（如 `:::intent{type="invariant"} :::invariant{...} :::`）？目前推荐**不支持嵌套**——简化 v0.4+ 启动
- [ ] **Q2**：`:::term` 是否走 `:::intent` 同一机制？目前推荐**走另一套 directive**（`:::term{#id type="entity"}`）保持语义清晰
- [ ] **Q3**：14 builtin probe 的 v0.2 grammar 升级（T10 scheme 字段）是否仍生效？目前推荐**保留**——Kernel Schema 不感知，adapter 兼容
- [ ] **Q4**：路线 C 启动时是否一次性完成 .oxn → .md 迁移？目前推荐**渐进**——阶段 3 阶段
- [ ] **Q5**：oxn-md-renderer 工具的范围？仅 Notion / GitHub？还是包含 Slack / Discord / Linear？目前推荐**Notion + GitHub**（PM 主要场景）
- [ ] **Q6**：v0.3.0 是否包含 Verdict → MD/HTML 双输出？目前推荐**是**（与 spike 同期）

---

## 16. 结论

5 轮 AI 讨论（`docs_tmp/md-unified-1.md`）+ 用户战略决策 + 源码事实核对，**路线 C 作为终局方向已被采纳**：

**关键不变量**：

1. **路线 C 是 v0.4+ 远期愿景**——不在 v0.2/v0.3 启动
2. **v0.2.0 必须先冻结**——避免 T10/T11/T12 done 任务与路线 C 冲突
3. **双轨期 .oxn + .md 并存**——平滑过渡；migration 工具支撑
4. **14 builtin probe 渐进替换**——1-2-5-14 顺序；不破坏 v0.2 兼容性
5. **Langium 依赖双轨期保留，阶段 5 移除**——避免破坏性变更堆积
6. **Verdict → MD/HTML 双输出 v0.3 主线**——与路线 C 解耦，可与 spike 同期
7. **T10/T11/T12 done 任务标记 deprecated**——承认历史，但不删除
8. **oxn-vscode 扩展阶段 4 重建**——IDE 体验不中断

**graduate 路径**：

```
v0.2.0 冻结 (按原计划 9 步)
   ↓
v0.3.0 冻结 (含路线 A spike + Verdict → MD/HTML)
   ↓
路线 C 启动 (17 周, 5 阶段)
   ├─ 阶段 0: 准备 (1-2 周)
   ├─ 阶段 1: 基础 (3 周)
   ├─ 阶段 2: probe 渐进 (4 周)
   ├─ 阶段 3: 资产迁移 (4 周)
   ├─ 阶段 4: 工具 (3 周)
   └─ 阶段 5: 收尾 (2 周)
   ↓
v0.4.0 冻结 (全栈 unified 重写完成)
```

**当前立即执行**：路线 C 远期档本文档已创建；路线 A + B 文档已标记 deprecated；**v0.2.0 冻结仍待你发"开始"**（需先完成 README.md 改进）。
