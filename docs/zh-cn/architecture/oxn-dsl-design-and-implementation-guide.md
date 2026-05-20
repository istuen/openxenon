# OXN DSL 设计与实现指南
**版本**: 1.0.0
**适用项目**: OpenXenon
## 目录
1. 引言与设计哲学
2. 词法与基础语法
3. 寻址与作用域机制
4. 核心实体定义（结构层）
5. 行为约束与验证（对齐层）
6. Task 实例化与涌现机制
7. 文档与资产打包流通
8. 编译管线与运行时架构
9. LLM/AI 集成最佳实践
---
# 第 1 章：引言与设计哲学
## 1.1 什么是 OXN
OXN (OpenXenon eXtensible Notation) 是一门面向 AI 对齐、基础设施约束与系统演化的声明式领域特定语言（DSL）。
传统 IaC 关注“如何部署和执行”，而 OXN 关注**“如何约束和验证”**。它不用于编写业务逻辑，而是用于声明系统的结构、参数契约、期望状态，以及 AI 执行任务时必须遵守的宪法边界。
## 1.2 核心设计原则
1. **结构/参数分离，允许受控变异**：Blueprint 锁定结构，Task 注入参数；面对不确定性，允许在隔离沙箱中变异结构，合格后回流涌现。
2. **约束优于计算，拒绝意外图灵完备**：声明式描述“是什么”，严禁副作用与自定义函数，条件逻辑仅限极简三元表达式。
3. **设计期与运行期严格隔离**：OXN 是纯设计时语言，OpenXenon Core 仅消费求值后的 `frozen.json` 纯数据 DAG，保证引擎极简与语言无关。
4. **单文件资产流通**：摒弃压缩包与散落文件，物理内联的 `<name>.bundle.oxn` 是唯一流通载体。
---
# 第 2 章：词法与基础语法
## 2.1 文件形态与字符集
- **扩展名**：统一使用 `.oxn`。
- **字符集**：UTF-8 编码。
## 2.2 标识符、关键字与注释
### 标识符与强制双引号规则
**核心铁律**：OXN 中所有实体（Blueprint, Part, Probe, Stage, Param 等）的名称标签，**必须使用双引号包裹**。
- 合法：`blueprint "feature-pipeline" { ... }`
- 非法：`blueprint feature-pipeline { ... }` （词法解析会将短横线识别为减号，导致崩溃）
此规则彻底消灭词法歧义，完美支持云原生主流的短横线命名法。
### 保留关键字
`blueprint`, `part`, `probe`, `interface`, `task`, `bundle`, `slot`, `stage`, `param`, `prop`, `method`, `output`, `execution`, `expectation`, `rule`, `implements`, `contract`, `deps`, `use`, `binding`, `true`, `false`, `null`, `enum`, `any`, `list`, `map`
### 注释
- 行内注释：`// comment`
- 块注释：`/* comment */`
## 2.3 类型系统
强类型设计，编译期必须明确类型。
- **原子类型**：`string`, `number`, `boolean`
- **集合类型**：`list<T>`, `map<T>`
- **约束类型**：`enum(val1, val2, ...)`, `any`
- **属性修饰符**：`required = true`, `default = <value>`
## 2.4 表达式与运算符
- **变量引用**：`param.xxx`, `prop.xxx`, `context` (仅在 Part execution 中可用)
- **运算**：比较 (`==`, `!=`等)，逻辑 (`&&`, `||`, `!`)，算术 (`+`, `-`等)
- **三元表达式**：`condition ? val_true : val_false` (严禁嵌套超过一层)
- **管道操作符 `|>`**：**严格限制**仅在 Part 的 `execution` 块中使用，如 `context |> probe.step_a |> probe.step_b`
- **模板字符串**：`"prefix_${param.xxx}_suffix"`
---
# 第 3 章：寻址与作用域机制
OXN 采用基于字符串路径的统一寻址规范，完美映射文件系统结构，消除词法冲突。
## 3.1 三级作用域前缀
| 前缀        | 范围   | 物理映射路径                            | 示例                  |
| :---------- | :----- | :-------------------------------------- | :-------------------- |
| **`@oxn/`** | 内置   | BUILTIN_PARTS / BUILTIN_PROBES (硬编码) | `"@oxn/shell-exec"`   |
| **`@prj/`** | 项目级 | `.openxenon/arsenals/`                  | `"@prj/verify-entry"` |
| **`@glo/`** | 全局级 | `~/.openxenon/arsenals/`                | `"@glo/common-part"`  |
## 3.2 路径寻址规则
跨文件引用外部实体时，采用**纯字符串路径**，格式为 `"@scope/type-name"`。
- 类型推断由赋值左侧的上下文自动完成（如 `use = ...` 推断为 Blueprint，插槽赋值推断为 Part）。
- 全局域的子命名空间通过路径扩展体现，如 `"@glo/team-a/common-part"`。
**示例**：
```hcl
use = "@prj/blueprint/ci-pipeline"
ref = "@oxn/probe/fs-exists"
```
---
# 第 4 章：核心实体定义（结构层）
## 4.1 Probe（原子探针）
最小执行动作，代表一次底层交互。
```hcl
probe "fs-exists" {
  description = "验证文件是否存在"
  param "path" { type = string; required = true }
  output { exists = boolean }
}
```
## 4.2 Interface（行为契约）
定义能力规范，不包含实现，是实现多态解耦的核心。
```hcl
interface "test-runner" {
  method "run" {
    input { env = string }
    output { passed = boolean }
  }
}
```
## 4.3 Part（可复用零件）
对 Probe 的封装，提供具体业务能力。必须通过 `implements` 声明遵循的 Interface。
```hcl
part "jest-runner" implements "test-runner" {
  prop "coverage_threshold" { type = number; default = 80 }
  probe "run_tests" {
    ref = "@oxn/probe/shell-exec"
    params = { command = "npm test -- --coverageThreshold=${prop.coverage_threshold}" }
  }
  execution = context |> probe.run_tests
}
```
## 4.4 Blueprint（执行蓝图）
顶层图纸，声明需要的零件能力、参数和 DAG 阶段。
**核心重构**：摒弃 `slot`，直接使用 `part` 声明需求，实现概念统一。
```hcl
blueprint "feature-pipeline" {
  version = 1
  param "env" { type = enum("dev", "staging"); default = "dev" }
  // 声明零件需求，约束必须实现的接口
  part "tester" { implements = "test-runner" }
  stage "unit_test" {
    run  = part.tester.run // 直接引用零件方法
    deps = [] // 依赖的其他 stage 名称数组
  }
}
```
---
# 第 5 章：行为约束与验证（对齐层）
## 5.1 Expectation（期望断言）
绑定在 Blueprint 上的硬性运行时断言。Stage 执行完毕后触发，调用探针校验系统状态。
```hcl
blueprint "feature-pipeline" {
  // ... 结构定义 ...
  expectation "must_use_zod" {
    probe  = "@oxn/probe/ts-uses-import"
    params = { file_pattern = "src/api/**/*.ts", module_name = "zod" }
    err_msg = "API 层代码违反规范：必须使用 Zod 进行参数校验"
  }
}
```
## 5.2 Rule（业务规则校验）
编译期的静态逻辑校验，拦截非法参数组合。
```hcl
blueprint "app-deploy" {
  param "env" { type = enum("dev", "prod") }
  param "ha_enabled" { type = boolean; default = false }
  rule "prod_requires_ha" {
    condition = param.env != "prod" || param.ha_enabled == true
    err_msg   = "部署到生产环境时，必须强制开启高可用配置"
  }
}
```
---
# 第 6 章：Task 实例化与涌现机制
Task 是 OXN 编译终点，将图纸转化为施工计划，并赋予系统进化生命力。
## 6.1 语法结构
左侧极简结构占位，右侧寻址定位。
```hcl
task "validate-feature-auth" {
  // 选用蓝图
  use = "@prj/blueprint/feature-pipeline"
  binding {
    // 零件具象化：左侧为蓝图内声明的 part 名，右侧为具体寻址
    tester = "@glo/part/jest-runner"
    // 参数注入
    param.env = "dev"
  }
}
```
## 6.2 隔离工作空间与变异模式
当现有 Blueprint 不满足需求时，Task 可打破结构锁定：
1. 将目标 Blueprint 复制到 Task 本地目录（沙箱）。
2. 编译器遵循**本地优先原则**，无视全局同名资产，强制以本地文件为准。
3. 在沙箱内允许修改 DAG、增删 Part，所有变异均闭环于当前 Task。
## 6.3 资产提升与回流（涌现）
当 Task 执行通过，证明变异结构可行时，通过 CLI 触发晋升：
- **Fork 同名覆盖 (`oxn promote <dir>`)**：进化与修正，覆盖全局资产库原文件（需确保向下兼容）。
- **Fork 新名扩展 (`oxn promote <dir> --as-new <name>`)**：创造与衍生，以新名称存入资产库，是最纯粹的“涌现”。
---
# 第 7 章：文档与资产打包流通
## 7.1 代码内文档
仅通过 `description = "..."` 承载单一功能描述，长篇指南置于资产包根目录的 `README.md`，编译器忽略。
## 7.2 单文件资产包：`<name>.bundle.oxn`
执行 `oxn compile` 时，散落的实体定义被**扁平化拼接**到同一个文件中。
```hcl
// === 内部依赖扁平化注入 ===
probe "shell-exec" { /* ... */ }
part "jest-runner" implements "test-runner" { /* ... */ }
// === 主体蓝图 ===
blueprint "ci-pipeline" { /* ... */ }
```
## 7.3 Schema 按需生成与安全解包
- **生成**：接收方对 `.bundle.oxn` 执行编译，动态生成 Zod Schema JSON，确保校验与源码绝对同步。
- **解包**：`oxn unpack` 默认解压至隔离目录（如 `./_unpacked_ci-pipeline/`），严禁自动覆盖本地同名资产。
---
# 第 8 章：编译管线与运行时架构
## 8.1 模块职责划分
- **`src/oxn-dsl/` (Langium 语法基石)**：解析 `.oxn` 生成 AST，执行静态校验（Rule, implements 契约），输出 OXN IR。
- **`src/kernel/compiler/` (求值与冻结引擎)**：执行参数求值、依赖注入、DAG 拓扑排序，输出 `frozen.json`。
- **Core / Daemon (纯 JSON 执行器)**：零 OXN 代码，仅读取 `frozen.json` 调度探针执行，收集对齐报告。
## 8.2 三态生命周期
1. **源态**：散落 `.oxn` 文件或沙箱变异文件。
2. **资产态**：`.bundle.oxn` 单文件，用于跨团队流通。
3. **冻结态**：`frozen.json`，纯数据执行图。
## 8.3 CLI 核心指令
- `oxn compile <path>`：编译为 `.bundle.oxn` 或生成 Schema。
- `oxn build-task <task.oxn>`：解析依赖与沙箱，产出 `frozen.json`。
- `oxn unpack <bundle.oxn>`：安全解包到隔离目录。
- `oxn promote <task_dir> [--as-new <name>]`：沙箱资产晋升回流。
---
# 第 9 章：LLM/AI 集成最佳实践
OXN 是 AI 对齐的宪法，其语法天然区分了“机器可探索的边界”和“人类不可逾越的红线”。
## 9.1 AI 角色定位
1. **参数注入者（引用模式）**：在固定蓝图内推断并填入业务参数。
2. **结构探索者（变异模式）**：在沙箱中修改 DAG 或替换零件，受控试错。
## 9.2 引用模式下的 Prompt 约束
向 AI 提供 Blueprint 摘要或 Schema，要求其仅输出 `task.oxn` 的 `binding` 块。AI 只被允许填空，任何试图修改契约的输出都会被编译器拦截。
```hcl
// AI 仅被允许生成此类代码
task "ai-task" {
  use = "@prj/blueprint/ci-pipeline"
  binding {
    tester = "@glo/part/jest-runner"
    param.env = "prod"
  }
}
```
## 9.3 变异模式下的 Prompt 引导
1. 引导 AI 调用工具将 Blueprint 复制到本地沙箱。
2. 允许 AI 修改 `stage` 的 `deps` 或更换 `part` 实现。
3. **涌现底线**：AI 可改变组合方式，但**严禁篡改 `implements` 契约和 `expectation` 断言**。无论怎么变异，必须满足人类设定的验收标准。
## 9.4 防御性设计：Zod Schema 拦截
AI 幻觉式填参（如枚举越界、类型错误）将被 OXN 编译器结合 Zod Schema 严格拦截，确保 `frozen.json` 的绝对纯洁。AI 在 OXN 框架内拥有探索自由，但绝无越界破坏的能力。


以下是为您补充的完整参考资料章节，保持了与前文一致的规范与严谨风格，可直接追加至指南末尾。
---
# 附录 A：设计与实现参考资料
OXN DSL 的设计并非凭空创造，而是建立在成熟的工业级配置语言规范、现代编译器框架以及 OpenXenon 已有的架构体系之上。本附录旨在明确 OXN 的设计渊源与实现依赖，为编译器开发与系统迁移提供指引。
## A.1 语法结构参考：HashiCorp Configuration Language (HCL)
OXN 的表层语法结构深度参考并遵循了 HCL 的设计哲学。HCL 作为 Terraform 等成功基础设施工具的基石，在“人类可读性”与“机器可解析性”之间取得了极佳的平衡。
**核心借鉴点：**
1. **块结构**：OXN 采用与 HCL 完全一致的 `type "label" { ... }` 语法拓扑。这种结构既具备 JSON 的层级表达能力，又通过换行和可选的分号提升了人类阅读体验。
2. **属性赋值**：`key = value` 的键值对范式，支持字符串、数字、布尔值、列表等基本类型的直观表达。
3. **强类型参数定义**：借鉴 Terraform 的 `variable` 块思路，OXN 在 `param` 和 `prop` 中强制声明 `type`，并在编译期进行严格类型检查。
4. **表达式与插值**：支持逻辑运算、比较运算以及 `${var}` 模板字符串插值。
**OXN 的约束与差异化：**
- OXN 剔除了 HCL 中用于动态生成资源的 `for` 表达式和 `dynamic` 块，坚决避免意外图灵完备。
- OXN 强制要求所有标识符标签必须使用双引号（`blueprint "xxx"`），以彻底消灭短横线命名法带来的词法歧义，这比 HCL 的默认解析规则更为严苛。
- OXN 引入了特有的 `@scope/` 寻址前缀和 `|>` 管道操作符（限制于 `execution` 块内），以适配工作流编排的特殊需求。
## A.2 语法编译实现：Langium
OXN DSL 的编译器前端将完全基于 **Langium** 框架构建。Langium 是一个基于 TypeScript 的现代语言工程框架，深度集成于 VS Code 生态，非常适合构建领域特定语言。
**基于 Langium 的实现策略：**
1. **语法定义**：在 `.langium` 文件中，利用 Langium 的 EBNF 变体形式化定义 OXN 的所有实体（Probe, Part, Blueprint, Task 等）及其嵌套规则。
2. **词法与解析**：Langium 将自动生成 LL(*) 解析器。我们将自定义词法规则，确保 `@oxn`, `@prj`, `@glo` 前缀以及双引号字符串路径被正确解析为专用的 AST 节点，而非普通的标识符。
3. **静态校验**：利用 Langium 的 Validation API 实现编译期拦截。包括但不限于：
   - `implements` 契约验证（确保 Part 实现了 Interface 要求的 method）。
   - `rule` 块的条件逻辑校验。
   - 寻址路径的连通性校验（确保 `"@prj/..."` 指向的实体在当前工作空间存在）。
4. **代码生成**：通过 Langium 的 Generator，将验证通过的 AST 转换为 OXN IR（中间表示），进而交由 `src/kernel/compiler/` 生成 `frozen.json` 或打包为 `.bundle.oxn`。
5. **语言服务 (LSP)**：开箱即用获得语法高亮、代码补全（特别是对 `@scope/` 寻址路径的补全）、悬浮提示与错误跳转，极大提升工程师与 AI 编写 OXN 的体验。
## A.3 OpenXenon 现有架构映射
OXN 并非推翻重来，而是对 OpenXenon 当前基于 YAML/JSON 体系的 DSL 级升华。两者在核心概念与运行时拓扑上完全对齐，OXN 仅仅是提供了更强大的约束表达与涌现能力。
**核心结构体系映射：**
| OXN DSL (未来)                          | OpenXenon YAML/JSON (当前)      | 语义对应说明                                         |
| :-------------------------------------- | :------------------------------ | :--------------------------------------------------- |
| `blueprint "xxx" {}`                    | `blueprint.yaml` / JSON 结构    | 顶层流程图纸定义                                     |
| `part "xxx" implements "yyy" {}`        | `parts/<name>.yaml`             | 可复用零件，OXN 增加了强契约校验                     |
| `probe "xxx" {}`                        | `probes/<name>.yaml` / 内置探针 | 最小执行动作定义                                     |
| `interface "xxx" {}`                    | (隐式约定)                      | OXN 新增：显式行为契约，替代 YAML 时代的隐式接口约束 |
| `task "xxx" { use = "..." binding {} }` | Task 实例空间 YAML              | 任务实例化与参数注入                                 |
**编译管线与实例空间映射：**
1. **前端异构，后端统一**：
   - 当前：YAML/JSON 文件直接被 Kernel 解析并构建为 DAG，生成 `frozen.json`。
   - 未来：`.oxn` 文件由 Langium 编译器解析为 AST，经过校验后生成 OXN IR，**最终仍交由现有的 Kernel Compiler 生成 `frozen.json`**。OpenXenon Core 执行引擎无需任何修改。
2. **Task 实例空间演进**：
   - 当前：Task 空间通过 YAML 配置引用 Blueprint，修改参数。
   - 未来：OXN 的 `task.oxn` 继承此逻辑，但通过 `use` 和 `binding` 提供更严格的类型注入。更重要的是，OXN 赋予了 Task 空间**“变异与涌现”**的能力——允许 Task 沙箱化地覆盖本地 Blueprint 文件，成功后通过 `oxn promote` 回流至全局资产库，这是当前 YAML 体系难以安全实现的。
3. **资产流通演进**：
   - 当前：依赖目录结构散落或压缩包。
   - 未来：OXN 规范了 `.bundle.oxn` 单文件物理内联机制，通过 Langium Generator 提取并扁平化所有依赖，使资产的分发与版本控制更加纯粹。

以下是为您补充的附录 B，详细阐述了 OpenXenon 现有架构的改造点，以及极其关键的“Slot 退场”设计推演。可直接追加至指南末尾。
---
# 附录 B：OpenXenon 架构改造与 Slot 退场说明
OXN DSL 的引入并非仅仅是语法的换皮，而是对 OpenXenon 底层编译管线与资产管理体系的重构。本附录明确系统改造的边界，并详细阐述“Slot 概念退场”的架构必然性。
## B.1 OpenXenon 核心改造点
为支撑 OXN DSL 的落地，OpenXenon 需在以下几个核心模块进行适配与重构，但始终坚守**“执行引擎零改造”**的底线。
### 1. 编译管线双轨制与平滑迁移
- **现状**：系统直接解析散落的 YAML/JSON 文件，构建内存对象图，输出 `frozen.json`。
- **改造**：引入基于 Langium 的 OXN 编译器前端。系统将支持一段时期的**双轨制**：根据文件后缀（`.oxn` vs `.yaml`/`.json`）路由至不同的解析器。两者最终均需输出统一的 OXN IR（中间表示），再交由现有的 Kernel Compiler 生成 `frozen.json`。
- **目标**：逐步将核心资产从 YAML 迁移至 OXN，最终下线 YAML 解析管线。
### 2. 资产管理机制升级
- **现状**：依赖特定的目录结构（`probes/`, `parts/`, `blueprints/`）进行资产发现与引用。
- **改造**：全面适配 OXN 的 `@scope` 寻址规范。
  - `@oxn/` 映射至原有的内置硬编码资产。
  - `@prj/` 映射至当前项目的 `.openxenon/arsenals/` 目录。
  - `@glo/` 映射至全局 `~/.openxenon/arsenals/` 目录。
- **新增**：支持 `.bundle.oxn` 单文件资产的导入、导出与安全解包机制。
### 3. CLI 指令集扩展
- 在原有指令基础上，新增 `oxn compile`（打包 Bundle）、`oxn unpack`（解包 Bundle）以及核心的 `oxn promote`（沙箱资产涌现回流）指令，支撑 Task 的变异与生命周期管理。
### 4. OpenXenon Core（零改造）
- **严格约束**：OXN 是纯粹的设计时语言。Core/Daemon 进程仅消费求值后的 `frozen.json` 纯数据 DAG。**对 Core 引擎而言，上层是 OXN 还是 YAML 是完全透明的，无需任何代码修改。**
---
## B.2 Slot 退场与 Part 统一说明
在 OXN DSL 的设计推演中，我们做出了一个极其重要且顺理成章的架构决策：**彻底废除 Slot 概念，在 Blueprint 中直接使用 Part 声明需求。**
### 1. Slot 的历史使命与局限
在 OpenXenon 早期的 YAML 体系中，引入 `Slot` 是一种无奈的妥协：
- **YAML 的表达力缺陷**：YAML 无法在语法层面表达“此处的值必须是一个实现了特定接口的组件”。
- **Slot 充当占位符**：为了在 Blueprint 中留出可插拔的空洞，不得不发明一个独立的概念 `Slot`，表示“这里需要一个能力”，然后在 Task 实例化时，将具体的 `Part` 塞入这个 `Slot`。
这导致了系统的概念冗余：**存在两种实体（Slot 和 Part），它们本质上都描述“能力”，只是一个抽象（带契约的空洞），一个具体（带实现的实体）。**
### 2. OXN 下的 Part 统一范式
OXN 作为强类型 DSL，拥有了 `Interface`（契约）和 `implements`（实现）的关键语法。这使得 `Slot` 彻底失去了存在的必要。
在 OXN 中，**Blueprint 里的 Part 就是“抽象的空洞”，Task 绑定注入的 Part 就是“具体的填补”。** 概念完美闭环。
**逻辑推演：**
1. `Interface "test-runner"` 定义了能力契约（有什么方法）。
2. Blueprint 中声明 `part "tester" { implements = "test-runner" }`。由于它只在 Blueprint 内部声明，没有具体实现（没有 `execution` 块），它自然就变成了一个**需求占位符**。
3. Task 中通过 `binding { tester = "@glo/part/jest-runner" }`，将一个真正拥有 `execution` 的具体 Part 赋值给 `tester`。
### 3. Slot 退场带来的巨大收益
- **概念归一**：系统中描述组件的实体**只有一个：Part**。Part 既可以用来定义具体实现（在全局 Forge 中），也可以用来声明契约需求（在 Blueprint 中）。极大幅度降低工程师与 AI 的心智负担。
- **语法极度平行对称**：
  ```hcl
  // Blueprint 声明需求
  blueprint "ci" {
    part "tester" { implements = "test-runner" }
    stage "test" { run = part.tester.run } // 直接引用 part
  }
  // Task 注入实现
  task "my-task" {
    use = "@prj/blueprint/ci"
    binding {
      tester = "@glo/part/jest" // 左侧 part 名，右侧 part 寻址
    }
  }
  ```
- **AI 对齐更简单**：在 Prompt 中，只需告诉 AI：“请为 Blueprint 中的 `part` 寻址并绑定一个具体的 `part`”。不再需要解释 Slot 和 Part 的映射关系，极大降低了 AI 的幻觉率。
**结论**：OXN DSL 通过 `Interface` + `Part` + `implements` 的组合，彻底消化了 `Slot` 的历史包袱，实现了架构的净净化与极简演化。所有原有的 YAML Slot 定义，在迁移至 OXN 时，将被无缝转换为 Blueprint 内部的 Part 声明。
