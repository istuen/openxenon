# OXN DSL 设计与实现指南
**版本**: 2.0.0 (架构修正版)
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
10. 附录 A：设计与实现参考资料
11. 附录 B：OpenXenon 架构改造与 Slot 退场说明
---
# 第 1 章：引言与设计哲学
## 1.1 什么是 OXN
OXN (OpenXenon eXtensible Notation) 是一门面向 AI 对齐、基础设施约束与系统演化的声明式领域特定语言（DSL）。传统 IaC 关注“如何部署和执行”，而 OXN 关注**“如何约束和验证”**。它不用于编写业务逻辑，而是用于声明系统的结构、参数契约、期望状态，以及 AI 执行任务时必须遵守的宪法边界。
## 1.2 核心设计原则
1. **结构/参数分离，允许受控变异**：Blueprint 锁定结构，Task 注入参数；面对不确定性，允许在隔离沙箱中变异结构，合格后回流涌现。
2. **约束优于计算，拒绝意外图灵完备**：声明式描述“是什么”，严禁副作用与自定义函数，条件逻辑仅限极简三元表达式。
3. **显式优于隐式，杜绝魔法穿透**：参数传递必须显式映射，严禁隐式上下文穿透；语义声明必须依赖关键字，严禁依靠结构缺失推断。
4. **设计期与运行期严格隔离**：OXN 是纯设计时语言，OpenXenon Core 仅消费求值后的 `frozen.json` 纯数据 DAG，保证引擎极简与语言无关。
5. **单文件资产流通**：摒弃压缩包与散落文件，物理内联的 `<name>.bundle.oxn` 是唯一流通载体。
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
### 保留关键字
`blueprint`, `abstract`, `part`, `probe`, `interface`, `task`, `bundle`, `stage`, `param`, `prop`, `method`, `output`, `execution`, `expectation`, `rule`, `implements`, `deps`, `use`, `binding`, `true`, `false`, `null`, `enum`, `any`, `list`, `map`
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
- **模板字符串**：`"prefix_${prop.xxx}_suffix"`
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
- 类型推断由赋值左侧的上下文自动完成。
- 全局域的子命名空间通过路径扩展体现，如 `"@glo/team-a/common-part"`。
---
# 第 4 章：核心实体定义（结构层）
## 4.1 Probe（原子探针）
最小执行动作，代表一次底层交互。**纯执行器，禁止携带默认值。**
```hcl
probe "fs-exists" {
  description = "验证文件是否存在"
  // 对外声明所需参数，一律用 prop。只有 required，禁止 default
  prop "path" { type = string; required = true } 
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
## 4.3 Part（可复用零件 - 具象实现）
对 Probe 的封装，提供具体业务能力。必须通过 `implements` 声明遵循的 Interface。
```hcl
part "jest-runner" implements "test-runner" {
  // 对外声明参数一律用 prop，允许 default
  prop "coverage_threshold" { type = number; default = 80 }
  prop "target_env" { type = string; default = "dev" }
  probe "run_tests" {
    ref = "@oxn/probe/shell-exec"
    // 对内注入给 Probe 一律用 params
    params = { 
      command = "npm test -- --coverageThreshold=${prop.coverage_threshold} --env=${prop.target_env}" 
    }
  }
  // execution 改为数组声明，剥离命令式管道控制流
  execution = [probe.run_tests] 
}
```
## 4.4 Blueprint（执行蓝图）与 Abstract Part（抽象需求）
顶层图纸，声明需要的零件能力、参数和 DAG 阶段。
**核心重构**：摒弃 `slot`，引入 `abstract part` 显式声明占位符，并强制显式参数映射。
```hcl
blueprint "feature-pipeline" {
  version = 1
  
  // 蓝图对外声明参数一律用 prop
  prop "env" { type = enum("dev", "staging", "prod"); default = "dev" }
  prop "coverage" { type = number; default = 80 }
  // 显式声明抽象需求！严禁隐式推断
  abstract part "tester" { 
    implements = "test-runner"
    
    // 显式参数映射：将 Blueprint 的 prop 映射给未来绑定的具象 Part 的 prop
    // 杜绝魔法穿透！支持极简三元表达式
    params = { 
      target_env = prop.env,
      coverage_threshold = prop.env == "prod" ? 95 : prop.coverage
    } 
  }
  stage "unit_test" {
    run = part.tester.run // 直接引用零件方法
    deps = []
  }
}
```
---
# 第 5 章：行为约束与验证（对齐层）
## 5.1 Expectation（期望断言）
绑定在 Blueprint 上的硬性运行时断言。
```hcl
blueprint "feature-pipeline" {
  // ... 结构定义 ...
  expectation "must_use_zod" {
    probe  = "@oxn/probe/ts-uses-import"
    // 对内注入用 params
    params = { file_pattern = "src/api/**/*.ts", module_name = "zod" }
    err_msg = "API 层代码违反规范：必须使用 Zod 进行参数校验"
  }
}
```
## 5.2 Rule（业务规则校验）
编译期的静态逻辑校验。
```hcl
blueprint "app-deploy" {
  prop "env" { type = enum("dev", "prod") }
  prop "ha_enabled" { type = boolean; default = false }
  rule "prod_requires_ha" {
    condition = prop.env != "prod" || prop.ha_enabled == true
    err_msg   = "部署到生产环境时，必须强制开启高可用配置"
  }
}
```
---
# 第 6 章：Task 实例化与涌现机制
Task 是 OXN 编译终点，将图纸转化为施工计划，并赋予系统进化生命力。
## 6.1 语法结构与参数映射
左侧极简结构占位，右侧寻址定位。**向 Blueprint 传参统一使用 `props`。**
```hcl
task "validate-feature-auth" {
  use = "@prj/blueprint/feature-pipeline"
  binding {
    // 零件具象化：左侧为蓝图内声明的 abstract part 名，右侧为具体寻址
    tester = "@glo/part/jest-runner"
    
    // 参数注入：映射到 Blueprint 的 prop，进而通过 abstract part 的 params 传入具体 Part
    props.env = "prod"
    props.coverage = 90
  }
}
```
**数据流向闭环**：Task `props` -> Blueprint `prop` -> Abstract Part `params` -> Concrete Part `prop` -> Probe `params`。全链路显式，零穿透。
## 6.2 隔离工作空间与变异模式
当现有 Blueprint 不满足需求时，Task 可打破结构锁定：
1. 将目标 Blueprint 复制到 Task 本地目录（沙箱）。
2. 编译器遵循**本地优先原则**，无视全局同名资产，强制以本地文件为准。
3. 在沙箱内允许修改 DAG、增删 Part，所有变异均闭环于当前 Task。
4. **编译期边界**：沙箱变异必须通过 DAG 完整性校验。删除被 `expectation` 依赖的 Part，等同于编译错误。
## 6.3 资产提升与回流（涌现）
当 Task 执行通过，通过 CLI 触发晋升：
- **Fork 同名覆盖 (`oxn promote <dir>`)**：进化与修正。
- **Fork 新名扩展 (`oxn promote <dir> --as-new <name>`)**：创造与衍生（涌现）。
---
# 第 7 章：文档与资产打包流通
## 7.1 代码内文档
仅通过 `description = "..."` 承载单一功能描述，长篇指南置于资产包根目录的 `README.md`。
## 7.2 单文件资产包：`<name>.bundle.oxn` (Assembly 态)
执行 `oxn compile` 时，散落的实体定义被**扁平化拼接**到同一个文件中。
**严格定义**：`.bundle.oxn` 是 OXN 的 Assembly 态。它通过扁平化拼接消除了 `ref` 外部依赖，但**保留了 `prop` 和 `params` 的模板占位符**。它可分享，但不可直接执行。
```hcl
// === 内部依赖扁平化注入 ===
probe "shell-exec" { /* ... */ }
part "jest-runner" implements "test-runner" { /* ... */ }
// === 主体蓝图 (保留占位符) ===
blueprint "ci-pipeline" { /* ... */ }
```
## 7.3 双轨流通与安全解包
- **双轨输出**：`oxn compile` 必须同时产出：
  1. `.bundle.oxn`：供人类查阅和跨团队交流的源码包。
  2. `.bundle.assembly.json` + `.bundle.assembly.schema.json`：由 DSL 直接求值生成的纯数据契约。Phase 2 编译优先读取 JSON 契约，而非重新解析 OXN 文本，守住运行时隔离底线。
- **解包**：`oxn unpack` 默认解压至隔离目录，严禁自动覆盖本地同名资产。
---
# 第 8 章：编译管线与运行时架构
## 8.1 模块职责划分
- **`src/oxn-dsl/` (Langium 语法基石)**：解析 `.oxn` 生成 AST，执行静态校验（Rule, Part 二态校验），输出 OXN IR。
- **`src/kernel/compiler/` (求值与冻结引擎)**：执行参数求值、依赖注入、DAG 拓扑排序，输出 `frozen.json`。
- **Core / Daemon (纯 JSON 执行器)**：零 OXN 代码，仅读取 `frozen.json` 调度探针执行。
## 8.2 严格的三态生命周期
1. **源态**：散落 `.oxn` 文件或沙箱变异文件。包含 `ref` 外部引用。
2. **资产态/Assembly 态**：`.bundle.oxn` + `assembly.json`。内联了所有依赖，但保留了 `prop` 占位符。可分享，不可执行。
3. **冻结态/Frozen 态**：`frozen.json`。零引用，零占位符，纯数据 DAG，Core 直接消费。
## 8.3 CLI 核心指令对齐
- `oxn compile <path>`：源码 -> 资产态 (产出 `.bundle.oxn` 及对应 JSON 契约)。
- `oxn build-task <task.oxn>`：资产态 + Task绑定 -> 冻结态 (产出 `frozen.json`)。
- `oxn unpack <bundle.oxn>`：资产态 -> 源码 (安全解包到隔离目录)。
- `oxn promote <task_dir> [--as-new <name>]`：沙箱源态 -> 全局源态 (涌现回流)。
---
# 第 9 章：LLM/AI 集成最佳实践
OXN 是 AI 对齐的宪法，其语法天然区分了“机器可探索的边界”和“人类不可逾越的红线”。
## 9.1 AI 角色定位
1. **参数注入者（引用模式）**：在固定蓝图内推断并填入业务参数。
2. **结构探索者（变异模式）**：在沙箱中修改 DAG 或替换零件，受控试错。
## 9.2 引用模式下的 Prompt 约束
向 AI 提供 Blueprint 摘要或 Schema，要求其仅输出 `task.oxn` 的 `binding` 块。
```hcl
task "ai-task" {
  use = "@prj/blueprint/ci-pipeline"
  binding {
    tester = "@glo/part/jest-runner"
    props.env = "prod" // 严格校验类型与枚举
  }
}
```
## 9.3 变异模式下的 Prompt 引导
1. 引导 AI 调用工具将 Blueprint 复制到本地沙箱。
2. 允许 AI 修改 `stage` 的 `deps` 或更换 `abstract part` 的绑定。
3. **涌现底线**：AI 可改变组合方式，但**严禁篡改 `implements` 契约和 `expectation` 断言**。
## 9.4 防御性设计：Zod Schema 拦截
AI 幻觉式填参（如枚举越界、类型错误、遗漏 `abstract part` 绑定）将被 OXN 编译器结合 Zod Schema 严格拦截。
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
- OXN 引入了特有的 @scope/ 寻址前缀和 abstract 二态修饰符，以适配工作流编排与多态解耦的特殊需求；同时剔除了命令式管道，执行流完全交由 Stage DAG 声明。
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
---
# 附录 B：OpenXenon 架构改造与 Slot 退场说明
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
## B.2 Slot 退场与 Abstract Part 显式声明
在 OXN DSL 的设计推演中，我们做出了一个极其重要的架构决策：**彻底废除 Slot 概念，在 Blueprint 中直接使用 Part 声明需求，并通过 `abstract` 关键字显式标记。**
### 1. Slot 的历史局限与隐式推断的毒药
在 YAML 体系中，`Slot` 是表达力缺陷的无奈补丁。OXN 引入 `Interface` 后，Slot 失去了存在的必要。
但在早期设计中，试图通过“缺少 execution 块”来隐式推断一个 Part 是抽象占位符，这是极其脆弱的：
- 工程师或 AI 随手加一个空 `execution`，占位符语义瞬间崩塌。
- 编译器必须依赖结构缺失来改变语义逻辑，违背了 DSL “显式优于隐式”的铁律。
### 2. Abstract Part：显式二态范式
OXN 采用 `abstract part` 前置修饰符，在 AST 层面直接隔离“抽象需求”与“具象实现”。
```hcl
// 抽象态：存在于 Blueprint 内，显式声明
abstract part "tester" { 
  implements = "test-runner"
  params = { target_env = prop.env } // 强制显式参数映射
  // 编译器拦截：此处严禁包含 execution 块
}
// 具象态：存在于全局资产库
part "jest-runner" implements "test-runner" {
  prop "target_env" { type = string }
  execution = [probe.run_tests] // 必须包含 execution
}
```
### 3. 核心收益
- **AST 降维**：Langium 直接解析为 `AbstractPart` 节点，无需后天校验推断，从源头杜绝 AI 随意添加 `execution` 导致的崩溃。
- **概念归一**：系统只有 `Part` 一种组件实体，AI Prompt 无需解释 Slot 映射。
- **参数闭环**：通过 `abstract part` 内的 `params` 强制显式映射，彻底消灭隐式魔法穿透，坚守架构底线。
