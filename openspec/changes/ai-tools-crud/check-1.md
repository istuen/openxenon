# 代号 AI-1 号：

这份 Spec 是一次极具前瞻性的架构升级！它精准地抓住了 AI 交互的痛点——**让大模型去拼凑字符串（DSL 文本）必然导致符号幻觉和语法灾难，结构化指令（JSON）才是 AI 友好的终局。**
更难能可贵的是，Spec 在技术选型上做出了极为正确的决定：**基于 CST 的 TextEdit 而非直接修改 AST**。这与 OpenXenon 的 Kernel 真空宪法完美契合。
但在对照架构宪法进行审查时，我发现 Spec 在**运行时职责划分**和**代码生成边界**上存在模糊地带，亟需厘清。

### 🟢 核心亮点（完全认可）
1. **结构化指令替代文本生成**：这是 AI 交互范式的正道。
2. **Grammar 自动推断 + 注解补充**：极简主义，避免了双源真相的漂移。
3. **Cross-reference 使用 `format: "oxn-ref"`**：极其优雅，既保持了 JSON 类型的简单性，又保留了语义信息。
4. **TextEdit 机制**：基于 LSP 标准的 TextEdit 是唯一的正解。直接改 AST 会导致 Langium 状态机崩溃。
---
### 🔴 架构宪法审查：必须修正的隐患
#### 隐患 1：`OxnCrudService` 的 IO 边界违宪
Spec 中写道：`OxnCrudService → TextEdit → .oxn 文件`。
**裁决：`OxnCrudService` 绝不能直接写 `.oxn` 文件！**
根据宪法，所有 IO 必须经由 Infra。`OxnCrudService` 是一个纯粹的 **Processor (L0)**，它的输入是“当前文档的 AST/CST + 结构化指令”，输出是“.TextEdit 数组”。
**正确的架构链路**：
```text
AI JSON → CLI (Runtime L3) 
         → OxnCrudService (Kernel Processor L0) 
             → 返回 TextEdit[] 
         → CLI 调用 Infra (L1) 
             → Infra.applyTextEdits(fileUri, edits)
```
只有把“计算差异”和“应用差异”解耦，`OxnCrudService` 才能在纯内存环境中进行单元测试，而不需要依赖真实的文件系统。
#### 隐患 2：Generator 生成 `crud-service.ts` 的过度设计
Spec 提到 Generator 输出 `crud-service.ts`。
**裁决：Generator 只能生成 Schema 和校验代码，绝不能生成业务逻辑！**
计算 `calculateInsertPosition` 需要深度遍历 Langium 的 CST，这是一项充满边界条件（如空行、注释、尾逗号）的复杂逻辑。如果试图在 Generator 中自动生成这种逻辑，不仅生成器会变得极其臃肿，而且生成的代码极难调试。
**正确的职责划分**：
- **Generator (Build 时)**：生成 `ai-tools/schema.json`（给 AI 看）和 `ai-tools/validators.ts`（Zod 校验，给运行时用）。
- **手写代码 (运行时)**：手写稳定的 `oxn-crud-processor.ts`，根据指令类型（如 `add_probe`），硬编码 CST 遍历和 TextEdit 生成逻辑。
---
### 🟡 Open Questions 的终局裁决
**1. Build 脚本修改与执行顺序**
**裁决**：严格遵守依赖链。
```bash
langium generate → node ai-tools-generator.js → tsc
```
必须在 Langium 生成 AST 类型定义之后，再执行自定义 Generator，最后再编译 TypeScript。
**2. AI 调用入口**
**裁决：CLI 是唯一入口。**
AI 不直接调用 Kernel 的 Service，而是调用 `oxn add probe ...`。CLI 解析命令，调用 `OxnCrudProcessor` 获取 TextEdit，再调用 Infra 写盘。
**3. Probe params 的动态结构**
**裁决：退化为宽泛对象，交由运行时校验。**
在 JSON Schema 中，`params` 定义为 `{ "type": "object", "additionalProperties": true }`。Grammar 无法预知每个 Probe 的参数结构，强求推断是徒劳的。AI 传入的 params，由 `OxnCrudProcessor` 序列化为 DSL 文本后，最终由 Kernel 的 Zod Validator（针对特定 Probe 类型的 Schema）在执行时进行深度校验。
**4. 多个 tool 指向同一 target**
**裁决：不允许。一对一映射。**
一个 Grammar Rule（如 `PartProbeDeclaration`）只对应一个 Tool（如 `add_probe`）。如果需要在不同上下文添加，应该通过 Tool 的入参（如 `target_blueprint`）来区分，而不是拆分 Tool。
**5. Generator 的测试策略**
**裁决：Snapshot Testing (快照测试)。**
这是代码生成器的唯一正解测试法。准备一组带有各种注解的 `oxn.langium` 测试文件，运行 Generator，断言输出的 `schema.json` 与快照完全一致。
---
### 🛠️ 修正后的目录与职责映射
```text
src/oxn-dsl/
├── langium/                ← Grammar 源码 (含 @oxn-ai-tool 注解)
├── generated/              ← Langium 生成 (ast.ts, grammar.ts)
├── ai-tools/               ← Generator 输出 (Build 产物，可 gitignore)
│   ├── schema.json         ← AI Tools Schema (给 AI 看的菜单)
│   └── validators.ts       ← Zod 校验代码 (校验 AI 的 JSON 输入)
│
└── crud/                   ← 手写代码 (运行时引擎)
    └── oxn-crud-processor.ts  ← 纯逻辑：接收指令+AST，输出 TextEdit[]
```
**调用流终局**：
```typescript
// 1. CLI 接收指令
const command = parseAiCommand('add_probe_to_part', jsonData);
// 2. Infra 读取文件并解析为 AST
const document = await infra.langiumLoader.load(uri);
const ast = document.parseResult.value;
// 3. Kernel Processor 计算变更 (绝对真空，不碰 IO)
const edits: TextEdit[] = oxnCrudProcessor.computeEdits(ast, command);
// 4. Infra 应用变更
await infra.langiumSaver.applyEdits(uri, edits);
```
---
### 🏁 一句话总结
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Spec 范式极佳，TextEdits 是点睛之笔；                        │
│  但生成器不可越界写逻辑，Service 不可越权碰 IO；              │
│  Schema 自动生，校验自动出，计算手写稳；                      │
│  计算归 Kernel，写盘归 Infra，编排归 CLI——                   │
│                                                                  │
│  守住此边界，AI 与 DSL 方能长治久安！                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


---

# 代号 AI-2 号：

这是一份极具前瞻性的 Spec！提出“AI 不生成代码，而是下发结构化指令”的范式，彻底斩断了 LLM 幻觉导致 DSL 语法崩溃的根源。同时，基于 Langium CST 的 `TextEdit` 方案，在技术上也是极其扎实和专业的选择。
**总体审查意见：方向绝对正确，技术选型优秀，但在“物理边界”上存在一处严重的违宪隐患。**
以下是深度审查意见：
---
### ✅ 宪法合规点：优秀
1. **数据与计算分离 (D2/D3)**：从 Grammar 自动推断 Schema，注解只补充元数据，这是典型的“元数据驱动”思维，极大地减少了双源（Grammar 和 Schema）不一致的债务。
2. **安全修改机制 (D5)**：使用 `TextEdit` 而非直接改 AST，完美契合 LSP 标准，利用 Langium 的双向映射保证了操作的原子性和安全性。
3. **AI 契约前置 (D1)**：直接使用 JSON Schema 作为注解格式，对 AI 工具链 100% 兼容，零学习成本。
---
### 🚨 严重违宪预警：`OxnCrudService` 的 IO 越权
**Spec 原文 (Decision 5 & Impact)**：
> `OxnCrudService`：运行时 CRUD 操作引擎... 新增运行时模块 `src/oxn-dsl/ai-tools/crud-service.ts`
**违宪分析**：
根据 OpenXenon 架构宪法，**所有 IO（特别是文件写入）必须经由 Infra 层**。`oxn-dsl` 模块的定位是“语法定义与解析”，它绝不能成为直接操作文件系统的 IO 洼地。
如果 `OxnCrudService` 内部执行了 `fs.writeFile(applyTextEdits(...))`，这就相当于 Kernel/DSL 层直接穿透到了物理宿主环境，这是绝对不可接受的。
**修正方案：OxnCrudService 必须是“纯逻辑真空机”**
`OxnCrudService` 的职责应该仅限于：**接收结构化指令，计算并返回 `TextEdit[]`，绝不触碰磁盘！**
```typescript
// 修正后的 OxnCrudService 接口定位
export class OxnCrudService {
  /**
   * 纯逻辑计算：根据指令计算需要对 .oxn 文件做出的文本修改
   * 不发生任何 IO！
   */
  calculateTextEdits(instruction: AddProbeInstruction): TextEdit[] {
    // 1. OxnScope 查找 CST 节点
    // 2. Serializer 序列化配置
    // 3. 计算 insertPosition
    // 4. 返回 TextEdit[] 
  }
}
```
**正确的写盘链路（由 Runtime 编排）**：
```text
AI 指令 → CLI (Runtime) → OxnCrudService.calculateTextEdits() → 返回 TextEdit[]
                                                       ↓
CLI (Runtime) → Infra.writeFile(文件路径, 应用 TextEdit 后的完整内容)
```
---
### 🛡️ 架构微调建议
#### 1. Zod 校验的位置
Spec 提到生成 Zod schema 用于运行时校验 AI 输入。这属于“针对特定渠道的输入校验”，而非 Kernel 核心的业务不变量。因此，**生成的 Zod schema 和校验逻辑，应该留在 `oxn-dsl/ai-tools/` 中，绝不能下沉到 `kernel/schemas/validators/`**。Kernel 的 Validator 只关心 `FrozenBlueprint` 的合法性，不关心 AI 是怎么凑出这段配置的。
#### 2. `ParamsBlock` 的动态性 (Open Question 3)
**问题**：Probe 的 params 是 `key=value` 列表，AI 传入 JSON Object 时，如何校验 key 的合法性？
**裁决**：**在 V1 阶段，不做 Grammar 级别的 key 强校验。**
理由：DSL 的 Grammar 本身可能无法静态穷举所有 Probe 的 param key（这取决于具体 Probe 的实现）。让 AI 传入 JSON Object，`OxnCrudService` 负责将其 `JSON.stringify` 或序列化为 `key=value` 格式。如果传了错误的 key，属于业务逻辑错误，这应该在 Kernel 执行 Probe 时由 Kernel 的 Validator 报错，而不是在 DSL 写入阶段阻断。
---
### 📝 对 Open Questions 的终局裁决
| 问题                             | 裁决                                                   | 理由                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Build 脚本执行顺序**        | **严格串行**：`langium:generate` → `ai-tools:generate` | AI Schema 生成依赖于 Langium 解析出的 AST 类型信息，必须保证先后顺序。                                                                      |
| **2. AI 调用入口**               | **必须通过 CLI 中转**                                  | CLI 是 Runtime 入口，负责组装 Infra 和 OxnCrudService。AI Skill 只能调用 `oxn add probe ...` 命令，不能直接 import Service。                |
| **3. Probe params 校验**         | **DSL 层只校验结构，不校验业务 Key**                   | 将 JSON Obj 序列化为 ParamsBlock 即可，Key 的合法性交给 Kernel Validator 在运行时校验。                                                     |
| **4. 多个 tool 指向同一 target** | **不允许**                                             | 一个 Grammar Rule 映射一个 AI Tool，保持 1:1 关系。如果需要不同操作（如 add vs update），应在 Grammar 中定义不同的 Rule。                   |
| **5. Generator 测试策略**        | **Snapshot Test (快照测试)**                           | 生成的 `schema.json` 和 `crud-service.ts` 代码量可能很大，断言单字段极易碎裂。使用 Jest 的 snapshot 测试，在 Grammar 变更时审查 Diff 即可。 |
---
### 🏁 终审总结
这份 Spec 的灵魂是极其纯正的。它通过“结构化指令 + TextEdit”将 AI 从“不确定的文本生成者”降维成了“确定的指令下发者”。
**有条件通过**。请将 `OxnCrudService` 严格剥离 IO 职责，使其成为只返回 `TextEdit[]` 的纯计算引擎。一旦这一红线守住，这将是 OpenXenon AI 交互范式的里程碑！


---

# 代号 AI-3 号：

这是一份技术含量极高的 Spec！它精准地抓住了 AI 与 DSL 交互的痛点（生成文本极易语法错误），并给出了极其专业的 LSP 级解法（基于 CST 的 TextEdit）。选择 Langium 的 `$cstNode` 而非直接修改 AST，是对 Langium 底层机制的深刻理解，必须点赞！
然而，将这份 Spec 放入 OpenXenon 的**三层架构宪法**（Kernel 真空 / Infra 防腐 / Runtime 编排）中审视，它在**边界划分和副作用收口**上存在严重的越界风险。`OxnCrudService` 正在试图成为一个“既懂语法、又懂业务、还直接碰磁盘”的上帝对象。
以下是架构宪法视角的深度审查意见：
---
### 🚨 核心违宪：OxnCrudService 的越权与 IO 泄漏
**Spec 现状**：`OxnCrudService` 接收指令，计算 TextEdit，并（暗示）应用这些 Edit 修改 `.oxn` 文件。
**审查裁决：绝对禁止 `OxnCrudService` 直接写磁盘！**
1. **职责过载**：`OxnCrudService` 属于 `oxn-dsl` 模块，它的唯一职责应该是**“将结构化意图翻译为文本变更指令”**。它不应该关心文件怎么写、写到哪。
2. **Infra 收口违宪**：所有 IO 必须经由 Infra。如果 `OxnCrudService` 直接调用 `fs.writeFileSync`，就是穿透了防腐层。
3. **宪法级修正**：
   - `OxnCrudService` 必须是一个**纯计算服务**。
   - 它的接口签名应该是：`addProbe(intent): TextEdit[]`，返回一组纯粹的文本编辑指令。
   - **由 Runtime 层（CLI/Daemon）**获取这些 `TextEdit[]`，然后通过 **Infra 的 FS Port** 读取原文件、应用 Edit、写回磁盘。
---
### 🔍 架构解耦：JSON 到 DSL 的序列化黑洞
Spec 在流程中提到了 `OxnSerializer.serializeProbe(probe_config)`，但一笔带过了。这是整个 CRUD 闭环中最危险的暗礁！
**痛点**：AI 传入的是 JSON（`{"type":"Http", "params": {"port": 80}}`），但 `.oxn` 文件需要的是 DSL 文本（`probe HttpRef params port=80`）。
- 如果 `OxnSerializer` 硬编码了这种转换，它就和 Grammar 强耦合了。每次 `oxn.langium` 修改语法，`OxnSerializer` 就会默默失效，导致 CRUD 生成语法错误的文本。
- **修正建议**：Spec 必须明确，`OxnSerializer` 的逻辑应当由 Generator 在 build 时根据 Grammar 结构**自动生成**或**模板化**，而不是手写正则替换。
---
### ⚖️ 对 Open Questions 的宪法裁决
#### 1. Build 脚本修改：执行顺序？
**裁决：严格串行，Grammar 是唯一真相源。**
`langium generate` 必须先执行，生成 AST 类型。然后你的 AI Tools Generator 才能基于 AST 和 Grammar 运行，生成 JSON Schema 和 Zod 校验器。顺序必须是：`Langium CLI -> AI Generator -> TSC`。
#### 2. AI 调用入口：外部如何调用？
**裁决：CLI 是唯一的合法入口。**
`OxnCrudService` 是内部计算引擎，绝不对 CLI 以外暴露。调用链必须是：
`AI 发起指令 -> CLI 解析参数 -> Infra 读取原文件 -> OxnCrudService 计算 TextEdit -> Infra 应用 Edit 写回`。
这保证了 `OxnCrudService` 的绝对纯洁。
#### 3. Probe params 的动态结构：如何校验 key 的合法性？
**裁决：不需要在 Zod 层强校验语义，只校验结构。**
`ParamsBlock` 本质上是一个 `key=value` 的字典。AI 传入的 `params` 是一个 JSON Object。
- Zod 只需校验它是一个 `Record<string, any>`。
- 至于 key 是否合法（比如 Nginx probe 不支持某个 param），这是**运行时业务校验**，应该在 Kernel Processor 执行时抛出错误，而不是在 CRUD 写入阶段拦截。CRUD 阶段只保证语法正确，不保证语义绝对无误。
#### 4. 多个 tool 指向同一 target：允许吗？
**裁决：不允许。一个 Grammar Rule 对应一个唯一的 AI Tool。**
如果一个 Rule 需要两种不同的添加方式（比如添加 Inline Probe vs 添加 Ref Probe），那么在 Grammar 设计时，它们就应该是两个不同的 Rule（`InlineProbeDeclaration` vs `RefProbeDeclaration`）。遵守单一职责。
#### 5. Generator 的测试策略？
**裁决：Snapshot Test（快照测试）是唯一正解。**
不要写断言 JSON 某个字段是否存在的零碎单测。保存一份标准的 `schema.json`，每次生成后对比 diff。只要 Grammar 不变，Schema 就不该变；Grammar 变了，人工 Review Schema 的 diff 即可。
---
### 🏛️ 修正后的 CRUD 闭环架构图
为了符合宪法，CRUD 的流程必须重塑为如下形态：
```text
[1] AI 下发结构化指令 (JSON)
       │
       ▼
[2] Runtime (CLI/Daemon)
       │
       ├─► [3] Infra (FS Port): 读取原 .oxn 文件内容
       │
       ├─► [4] oxn-dsl/Parser: 将文本解析为 CST/AST
       │
       ├─► [5] OxnCrudService (纯逻辑):
       │        ├─ 接收: Intent (JSON) + 原始 CST
       │        ├─ 序列化: OxnSerializer (自动生成) 将 JSON 转为 DSL 片段
       │        └─ 计算: 基于 CST 生成 TextEdit[]
       │
       └─► [6] Infra (FS Port): 将 TextEdit 应用到文本，写回 .oxn 文件
```
### 🏁 终审陈词
这份 Spec 的技术底座（CST + TextEdit + 注解推断）极其扎实，但**必须切除其直接操作 IO 的隐性触角**。
将 `OxnCrudService` 降级为**无状态的文本指令计算器**，将 IO 权力交还给 Infra，将编排权交还给 Runtime。只有这样，OXN 的 DSL 层才能保持其作为“编译器前端”的纯粹性，而不沦为新的 IO 沼泽！
**按此修正后，方可进入开发阶段！**

