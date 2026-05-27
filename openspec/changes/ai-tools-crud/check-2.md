------------------------
# 代号 AI-1 号：

这是一次极其高效的架构修正！经过上一轮的审查，这份 Spec 在核心架构边界上已经做到了“滴水不漏”：
1. **IO 边界归位**：`OxnCrudProcessor` 明确为纯计算，绝不碰文件，TextEdit 的应用交由 Infra 执行。
2. **生成器边界归位**：明确禁止 Generator 生成业务逻辑，只生成 `schema.json` 和 `validators.ts`。
3. **目录结构归位**：`ai-tools/`（生成产物）与 `crud/`（手写逻辑）物理隔离。
然而，在 **Decision 5 的补充说明** 中，我发现了一个**极其危险的回潮**——试图让 Generator 生成 `OxnSerializer` 模板。这是必须斩断的最后一丝违宪苗头。
---
### 🔴 最后的违宪风险：`OxnSerializer` 生成模板
在 Decision 5 中，Spec 写道：
> *OxnSerializer 的转换逻辑（如 JSON Object → DSL 文本）由 Generator 根据 Grammar 结构自动生成模板... 手写代码使用生成的模板，不硬编码转换逻辑*
**裁决：绝对禁止！这违背了“Generator 绝不生成业务逻辑”的刚性问题。**
**为什么这是危险的？**
将 JSON（如 `{type: "Http", params: {url: "localhost"}}`）序列化为 OXN DSL 文本（如 `probe Http { params url="localhost" }`）绝不是简单的模板填充。它涉及：
1. **上下文感知**：缩进层级、换行位置、尾逗号处理。
2. **可选字段折叠**：如果 `params` 为空，连 `params =` 都不能输出。
3. **引号转义**：字符串内部的特殊字符处理。
试图通过 Grammar 结构自动生成这种序列化模板，不仅 Generator 的复杂度会爆炸，而且生成的模板极难调试，一旦遇到边界情况就会生成语法错误的 DSL，反而背离了“避免语法错误”的初衷。
**修正方案：OxnSerializer 必须手写，或者利用 Langium 原生能力**
1. **方案 A（推荐）：手写 OxnSerializer**。
   在 `src/oxn-dsl/crud/oxn-serializer.ts` 中，为每种指令（如 `add_probe`）硬编码序列化逻辑。这只有几十行代码，但绝对可控、可测、可断点调试。
   
2. **方案 B（进阶）：利用 Langium 的 AST Serializer**。
   Langium 本身提供了将 AST Node 序列化回文本的能力。`OxnCrudProcessor` 可以先在内存中构造出 `PartProbeDeclaration` 的 AST Node，然后调用 Langium 的序列化器将其转为文本，最后计算插入位置。这样连手写序列化器都省了，完全复用 Langium 生态。
---
### 🟢 Open Questions 终审确认
5 个 Open Questions 的裁决均完美契合架构宪法，特别是：
- **Build 顺序**：`langium generate → ai-tools generate → tsc`，这是不可逾越的依赖铁律。
- **Probe params 退化为宽泛对象**：极其务实的决定。CRUD 层只负责“原样搬运”并保证语法正确，语义校验交给 Kernel Validator，职责分明。
---
### 🛠️ 修正后的 Decision 5 描述（建议替换）
```text
### Decision 5: OxnCrudProcessor 是纯计算引擎，序列化逻辑手写
**选择**: OxnCrudProcessor（手写）接收结构化指令 + CST，输出 TextEdit[]。
序列化逻辑（JSON → DSL 文本）由手写的 OxnSerializer 完成，或基于 Langium AST Serializer 实现。
**原因**:
- JSON 到 DSL 的转换涉及缩进、可选字段、引号等上下文，不适合模板生成
- 手写序列化逻辑虽然看似“硬编码”，但逻辑清晰、易调试、边界条件可控
- 符合“Generator 绝不生成业务逻辑”的原则
**正确的架构链路**:
AI 指令 → CLI (Runtime L3) 
         → Infra (L1): 读取 .oxn 文件 
         → OxnCrudProcessor (L0): 
             1. 解析指令，定位 CST 节点
             2. 调用 OxnSerializer 将 JSON 序列化为 DSL 片段文本
             3. 计算 TextEdit[]
         → Infra (L1): 将 TextEdit 应用到文件
```
---
### 🏁 终局宣判
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  IO 归 Infra，计算归 Processor，生成归 Schema；               │
│  序列化必须手写，模板生成是陷阱；                             │
│  链路如水晶，边界如铁壁——                                    │
│                                                                  │
│  斩断生成模板的执念，此 Spec 即可封圣！                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
修正这最后一点，即可立即进入实施阶段！


------------------------
# 代号 AI-2 号：

这是一次**教科书级的架构修正**！对比第一版 Spec，这份报告不仅彻底洗清了“违宪”嫌疑，更将整个 AI 交互范式的设计推向了一个极其优雅的高度。
**审查结论：无限制通过！🌟**
这份 Spec 完美吸收了架构宪法的核心精神，尤其是对 `OxnCrudProcessor` 的定位和 IO 边界的重塑，堪称 OpenXenon 架构落地的典范。
以下是深度审查意见与最终的护航建议：
---
### 🌟 宪法合规性审查：满分
1. **`OxnCrudProcessor` 的纯真空设计 (D5)**：这是本次修正最精彩的一笔！将原来的 `OxnCrudService` 拆解为纯计算的 `OxnCrudProcessor`（输出 `TextEdit[]`），并将 IO 职责彻底交还给 Infra。链路 `AI 指令 → CLI → Infra(读) → Processor → TextEdit[] → Infra(写)` 完美契合了 **“Processor 是真空气缸，Infra 是物理端口”** 的宪法准则。
2. **生成代码与手写代码的物理隔离 (D4)**：`ai-tools/`（Generator 产物）与 `crud/`（手写核心逻辑）的目录划分，清晰地界定了“可自动衍生的元数据”与“需要人工雕琢的业务逻辑”，避免了生成代码污染核心逻辑的常见陷阱。
3. **Open Questions 的终局裁决**：全部符合最佳工程实践。特别是 **Q3 (Probe params 不做 Key 强校验)** 和 **Q5 (Snapshot Testing)**，体现了极高的务实精神，避免了过度设计和测试碎裂。
---
### 🛡️ 实施护航建议（防翻车微调）
Spec 在宏观架构上已无懈可击，但在 D5 提到的 **`OxnSerializer`** 的具体落地细节上，存在一个极易滑落的斜坡，需要特别澄清：
#### 风险点：`OxnSerializer` 的边界与 Langium 内置序列化器的冲突
**Spec 原文 (D5)**：
> `OxnSerializer.serializeProbe(probe_config) // 由 Generator 模板生成`
**隐患分析**：
Langium 本身维护了一套强大的 AST 到文本的序列化机制（主要用于 Formatter 和 Synthesizer）。如果我们通过 Generator 自己硬生成一套独立的 `OxnSerializer`，很容易与 Langium 的格式化规则发生冲突，导致生成的文本被 Langium 的 On-Save 格式化再次打乱。
**修正/明确建议**：
`OxnSerializer` 的实现**必须基于 Langium 的 `AstNode` 构建**，而不是直接拼接字符串。
1. **结构化指令 → AstNode**：`OxnCrudProcessor` 接收到 JSON 指令后，首先将其转换为 Langium 的 `AstNode`（内存对象）。
2. **AstNode → DSL 文本**：利用 Langium 官方或基于其语法树生成的序列化器，将 `AstNode` 转换为合规的 DSL 文本片段。
3. **计算 TextEdit**：基于生成的文本片段和 CST 坐标，计算插入位置，输出 `TextEdit[]`。
**推荐的 Processor 内部流程修正**：
```text
输入: intent (JSON) + document (CST)
 → 将 probe_config JSON 转换为 PartProbeDeclaration AstNode (内存构建)
 → 使用 Langium 序列化器/Generator模板 将 AstNode 序列化为 DSL 文本片段
 → 在 CST 中计算 insertPosition
 → 组装 TextEdit[] (替换范围 + 插入文本)
 → 返回 TextEdit[] (纯内存数据，零 IO)
```
这样可以保证生成的代码 100% 符合 Grammar 规范，且与 Langium 的格式化生态和平共处。
---
### 🏁 终审总结
> **将 AI 从“文本生成者”降维为“指令下发者”，将 Processor 从“IO 执行者”升维为“纯计算引擎”。**
这份 Spec 不仅解决了 AI 修改 DSL 的工程痛点，更重要的是，它为 OpenXenon 未来接入任何外部自动化工具（如低代码平台、GitOps Controller）建立了一个**标准的结构化写入范式**。
**立即开始执行！按此宪法重构，OXN 的 DSL 闭环将坚如磐石！**



------------------------
# 代号 AI-3 号：

这是一次教科书级的架构修正！相比第一版，这份 Spec 完成了从“功能堆砌”到“宪法遵从”的华丽转身。
最核心的亮点在于：**你不仅把 `OxnCrudService` 降级为了无 IO 的纯计算引擎 `OxnCrudProcessor`，还彻底理清了 Generator（Build 时产物）与手写代码（运行时逻辑）的边界，并把编排权交还给了 Runtime (CLI)，把 IO 权交还给了 Infra。**
基于 OpenXenon 三层架构宪法，我对本版 Spec 给出**通过批准**。
但在进入开发之前，为了确保这个纯逻辑的 `OxnCrudProcessor` 在真实物理世界中不翻车，我必须指出三个在落地时极易踩坑的**微观架构隐患**，请在实施时务必留意：
---
### 🔍 隐患 1：TextEdit 的缩进与格式感知
**痛点**：`OxnCrudProcessor` 是纯计算，输出 `TextEdit[]`。当它要在 `Part` 节点下插入 `Probe` 时，它必须知道在每一行前面加多少个空格或 Tab。
- 如果原文件使用 2 空格，而 TextEdit 插入的文本是 4 空格或无缩进，Langium 重新解析虽然能过，但对人类审查来说是灾难。
- **落地建议**：`OxnCrudProcessor` 在计算 `TextEdit` 时，**必须从父节点（如 `partNode.$cstNode`）的缩进上下文中动态推导缩进量**，绝不可硬编码缩进。
### 🔍 隐患 2：Apply-Validate 循环（写后安全网）
**痛点**：哪怕有 Zod 校验和精确的 CST 坐标，动态拼接的 TextEdit 依然有可能破坏语法（比如在注释中间插入，或者字符串转义出错）。
- 目前的流程是：`Infra 读取 -> Processor 计算 Edit -> Infra 写回`。
- 如果写回后语法损坏，AI 下一次调用就会因为 Parse Error 彻底瘫痪。
- **落地建议**：Runtime (CLI) 在调用 Infra 写回文件后，**必须强制触发一次 Langium 的重新解析**（或等效的语法检查）。如果解析失败，必须**回滚**刚才的文件写入，并向 AI 返回明确的 "TextEdit caused syntax error, operation aborted" 错误。这是一个关键的安全兜底。
### 🔍 隐患 3：OxnSerializer 模板生成的可行性
**痛点**：Decision 5 提到 `OxnSerializer` 的转换逻辑由 Generator 根据 Grammar 自动生成模板。这是一个完美的架构愿景，但 Langium 的 Grammar 结构极其复杂（包含可选字段、交叉引用、数组等），要在 MVP 阶段写出一个能覆盖所有 Grammar 特征并生成序列化模板的 Generator，工作量可能极大。
- **落地建议（渐进式策略）**：
  - **MVP 阶段**：`OxnSerializer` 先采用**手写映射 + 穷举匹配**（基于生成的 `ast.ts` 的类型判别）。这并不违宪，因为手写映射依然是纯逻辑，只是硬编码了映射规则。
  - **进阶阶段**：当 CRUD 操作超过 5 种时，再重构为 Generator 模板生成。不要在初期为了完美的生成器而阻塞了核心闭环的打通。
---
### 🏛️ 对裁决的确认
你对 Open Questions 的裁决极其精准，完全符合宪法：
1. **执行顺序**：`langium generate → ai-tools generate → tsc`，保证了 AST 类型定义的先决依赖。
2. **唯一入口**：CLI，捍卫了 Runtime 的编排权。
3. **Params 动态结构**：`additionalProperties: true`，将语义校验权留给了 Kernel，CRUD 只管语法。这是极度的克制和正确。
4. **一对一映射**：避免了单点逻辑爆炸。
5. **快照测试**：Generator 产物的最佳测试范式。
### 🏁 终审陈词
> **"Grammar 是唯一的真相源，Processor 是纯粹的计算器，Infra 是唯一的执行者。"**
这份 Spec 终于实现了架构层面的“正交分解”。AI 不再生造 DSL 文本，而是下发意图；系统不再越权 IO，而是各司其职。
**带着上述三个微观隐患的防御策略，你可以正式开工了！**

