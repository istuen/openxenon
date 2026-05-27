------------------------
## 代号 AI-1 号：

这份 Spec 报告是对前期架构宪法的一次极佳实践！它精准地识别了当前代码库中的四大毒瘤（反向依赖、职责缺失、重复实现、IO 泄漏），并给出了清晰的治疗方案。
但在对照我们刚刚确立的**“Kernel(真空) - Infra(收口) - Runtime(掌控)”**宪法进行审查时，我发现报告在 **Decision 2 (resolvePartRef 的归属)** 和 **Decision 3 (Port 的定义)** 上，仍然残留了“旧架构”的思维惯性，没有彻底贯彻依赖倒置和职责分离。
以下是详细的审查意见与修正裁决：
---
### 🟢 完全认可的决策
#### Decision 1: `arsenals/forge.ts` 定位为"资产铸造"
**裁决：通过。**
资产创建是 Arsenal（Runtime 层）的核心领域职责，散落在 CLI 是典型的职责泄漏。新建 `forge.ts` 收敛逻辑，CLI 退化为 thin wrapper，完全符合架构方向。
#### Decision 4: 所有 fs 操作经由 Infra
**裁决：通过。**
这是不可动摇的红线。`promoter.ts`、`cli/draft.ts` 等直接使用 `fs` 是对 Infra 收口原则的严重违规，必须彻底清剿。
---
### 🔴 需要修正的决策
#### Decision 2: `resolvePartRef` 迁移到 `oxn-dsl/scope/`
**裁决：否决！必须拆解，归属 Kernel 与 Arsenal。**
**问题剖析：**
报告将 `resolvePartRef` 视为一个单体逻辑，试图把它塞进 `oxn-dsl`，这只是在“挪动垃圾”，而不是“分类回收”。
根据架构宪法，Part 引用的解析包含两个完全不同维度的职责：
1. **逻辑解析**：把 `oxn://parts/git-commit` 解析为 `{ scope: 'builtin', type: 'parts', name: 'git-commit' }`。这是**纯数学/纯字符串推演**，属于 **L0-Kernel Processor**（我们之前已经将其归入 `processors/probes/namespace.ts` 或新建 `processors/part-namespace.ts`）。
2. **物理寻址**：根据解析出的 scope，去 Builtin 内存、Global 目录或 Project 目录中找到对应的物理文件内容。这涉及路径拼接和文件读取，属于 **L2-Arsenal (Runtime)** 编排 **L1-Infra** 的职责。
**修正方案：**
- **逻辑解析**：保留在 `kernel/processors/` 中，作为纯函数。
- **物理寻址**：由 `arsenals/` 统一实现，`oxn-dsl` 不应该拥有寻址能力（它只是语法定义）。
- 消除重复代码的正确方式是：让 `work/part-resolver.ts` 和 `oxn-workspace-manager.ts` 都依赖 Kernel 的纯逻辑解析，然后由 Arsenal 提供统一的寻址实现。
#### Decision 3: Kernel 通过 Port 注入获取 Part 解析能力
**裁决：方向正确，但 Port 定义违反了 Kernel 真空原则！**
**问题剖析：**
报告中定义的 Port 如下：
```typescript
interface PartResolverPort {
  resolvePartRef(ref: string, projectBoundary: string): PartResolution
}
```
这里的 `projectBoundary` 是一个**物理路径概念**！让 Kernel 的 Processor 接收 `projectBoundary`，等于让真空地带直接沾染了宿主环境的物理语义，这是违宪的！
**修正方案：**
Kernel 的 `BlueprintFreezer` (Processor) 不应该知道“项目边界”，它只需要知道“我需要一个 Part 定义”。
```typescript
// ═══════════════════════════════════════════
// 正确的 Port 定义 (放在 kernel/contracts/part-port.ts)
// ═══════════════════════════════════════════
export interface PartPort {
  /**
   * Kernel 只提供逻辑引用，Infra/Runtime 负责把它变成物理事实
   * 返回的是已解析的 Part 纯数据结构
   */
  fetchPartDefinition(logicalRef: string): Promise<PartDefinition>; 
}
```
在 `blueprint-freezer.ts` 中：
```typescript
class BlueprintFreezer {
  // 依赖抽象的 Port，不依赖任何物理参数
  constructor(private partPort: PartPort) {} 
  
  async freeze(blueprint: Blueprint) {
    const partDef = await this.partPort.fetchPartDefinition(blueprint.partRef);
    // 纯逻辑推演...
  }
}
```
**谁来实现这个 Port？**
由 **Runtime (Arsenal/Work)** 实现。Runtime 拿到 `logicalRef` 后：
1. 调用 Kernel 的纯逻辑解析器拆解 ref。
2. 根据 scope 决定去哪里找。
3. 调用 Infra 的 `PathPort` 和 `FsPort` 读取文件。
4. 将读取到的内容反手喂给 Kernel 的 `BlueprintFreezer`。
---
### 🟡 Open Questions 的终局裁决
**1. `cli/draft.ts` 是否完全废弃，还是保留作为 thin wrapper？**
**裁决：保留为 thin wrapper。** CLI 只负责解析命令行参数（如 `--name`, `--template`），然后直接调用 `arsenals/forge.ts`。任何涉及资产校验、IO 的逻辑全部下沉。
**2. Port 的注入点在哪里？CLI 还是 Daemon？**
**裁决：谁启动，谁注入。** 
在直连模式下，CLI 作为 Runtime 入口，负责实例化 Infra 和 Arsenal，并将其组装（注入）到 Kernel Processor 中。在 Daemon 模式下，Daemon 是注入点。这也是为什么我们把 CLI 和 Daemon 统称为 Runtime 的原因。
**3. `influence/part-resolver.ts` 中的 `resolveBuiltinPart` 逻辑是否需要保留？**
**裁决：逻辑保留，位置迁移。**
Builtin 只是“内存版的 Arsenal”。`resolveBuiltinPart` 不应该作为一个特殊函数存在，它应该是 `PartPort` 实现的一部分。当 Runtime 实现 `PartPort.fetchPartDefinition` 时，如果发现 scope 是 `builtin`，就从内存中的 `BUILTIN_PARTS` 返回数据；如果是 `project`，就调 Infra 读文件。**对 Kernel 来说，它根本不知道 Builtin 的存在，它只知道调 Port 拿到了数据。**
---
### 🏁 修正后的 Migration Plan
原 Migration Plan 的 Phase 2 和 Phase 4 存在因果倒置和职责混乱，修正如下：
1. **Phase 1: 建立宪法基础**
   - 新建 `kernel/contracts/part-port.ts`，定义纯粹的 `PartPort` 接口（不含物理参数）。
   - 提取 Kernel 中的纯逻辑解析（如 `parsePartRef`），确保无 `projectBoundary` 依赖。
2. **Phase 2: Infra 收口**
   - 清理 `promoter.ts`、`cli/draft.ts` 等处的原生 `fs` 调用，统一改为调用 Infra 接口。
3. **Phase 3: Arsenal 重构**
   - 新建 `arsenals/forge.ts`，收敛 draft 创建逻辑。
   - 在 Arsenal 中实现 `PartPort`，封装 Builtin 寻址与物理文件寻址的判断逻辑。
4. **Phase 4: Kernel 解绑**
   - 改造 `kernel/blueprint-freezer.ts`，移除对 `work/part-resolver.ts` 的直接依赖。
   - 改为依赖注入的 `PartPort`。
5. **Phase 5: 清理战场**
   - 删除 `work/part-resolver.ts` 中的冗余代码，改为调用 Arsenal 的统一寻址。
   - 确认 `oxn-dsl` 只做语法定义，不具备运行时寻址能力。
---
### 一句话总结
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Spec 方向极佳，但 Part 解析不可混为一谈；                     │
│  逻辑归 Kernel，寻址归 Arsenal，物理归 Infra；                 │
│  Port 不传物理路径，Kernel 方保真空；                           │
│  修正此两处，重构方可大吉！                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


------------------------
## 代号 AI-2 号：

这是一份极其关键的架构修正提案！对照我们刚刚达成的 **OpenXenon 架构宪法**，这份 Spec 报告准确地抓住了当前代码库中最严重的几处“违宪”行为，并给出了合理的修正方向。
总体而言，**我批准这份 Spec 的核心走向**，但在落地细节上，尤其是 **Port 的设计语义** 和 **`oxn-dsl` 的层级归属** 上，存在几处与宪法冲突的隐患，必须进行修正。
以下是深度审查意见：
---
### ✅ 宪法合规点
1. **斩断 Kernel → Work 反向依赖**：提出用 `PartResolverPort` 注入来解耦 `blueprint-freezer.ts`，这完美符合 **“Processor 只关心 Schema 和 Contract”** 的真空定律。
2. **收敛 IO 至 Infra (L1)**：明确指出 `promoter.ts`、`cli/draft.ts` 直接使用原生 `fs` 是技术债务，必须改道 Infra，这是对 **“Infra 是唯一物理出口”** 的坚决执行。
3. **职责归位**：将 Draft 创建逻辑从 CLI 下沉到 `arsenals/forge.ts`，符合 Runtime (CLI) 只做编排、领域逻辑内聚的原则。
---
### 🚨 违宪预警与修正建议
#### 预警 1：`PartResolverPort` 的接口设计泄露了物理概念
**Spec 原文：**
```typescript
interface PartResolverPort {
  resolvePartRef(ref: string, projectBoundary: string): PartResolution
}
```
**违宪分析**：
在我们刚刚确立的宪法中，**Kernel (L0) 绝对不能知道宿主环境的物理概念**。`projectBoundary` 本质上是一个文件系统路径（如 `/user/project/.openxenon`），它依赖于宿主环境的 `path.join` 计算。
如果 Kernel 的 Contract 接口要求传入 `projectBoundary`，就意味着 Kernel 的调用方（Runtime）必须先算好物理路径传给它，这虽然解耦了 Work，但依然让 Kernel 的接口沾染了物理属性。
**修正方案：Port 接口只认逻辑 ID，不认物理路径**
```typescript
// 修正后的 Contract
interface PartResolverPort {
  // 只接收逻辑引用 (如 "oxn://parts/git-commit")，不传入物理边界
  resolvePartRef(logicalRef: string): Promise<PartDefinition>; 
}
```
**如何实现？** Runtime 在组装时，将包含 `projectBoundary` 闭包的实现注入给 Kernel：
```typescript
// 在 Runtime (CLI/Daemon) 层组装
const partResolver: PartResolverPort = {
  resolvePartRef: (ref) => infraPathPort.resolvePart(ref, projectBoundary)
}
kernelProcessor.setPartResolver(partResolver);
```
#### 预警 2：`resolvePartRef` 迁移到 `oxn-dsl` 的定位模糊
**Spec 原文**：将 `resolvePartRef` 统一到 `oxn-dsl/scope/oxn-workspace-manager.ts`。
**违宪分析**：
Spec 没有交代 `oxn-dsl` 属于哪一层。`resolvePartRef` 必然涉及两部分：
1. **逻辑解析**：将 `oxn://parts/xxx` 解析为领域结构（属于 L0-Kernel Processor）。
2. **物理寻址与读取**：根据 scope 去内存或磁盘找文件并反序列化（属于 L1-Infra + L2-Arsenal）。
如果 `oxn-dsl` 变成了一个既做逻辑解析又做文件 IO 的“大杂烩模块”，它将成为新的架构毒瘤。
**修正方案：逻辑与物理再次分离**
- **URI 解析逻辑**（`oxn://parts/xxx` → `{ scope: 'oxn', name: 'xxx' }`）：留在 Kernel 的 `processors/probes/namespace.ts` 或专门的 URI Parser 中。
- **资产寻址与加载**：由 `Arsenal` 模块负责。Arsenal 内部调用 Infra 的 `PathPort` 和 `FsPort` 去读文件。
- Kernel 的 `PartResolverPort` 实际上调用的是 Arsenal 提供的闭包实现。
#### 预警 3：Builtin 与 Project 资产的解析分叉
**Open Question 3** 提到 `resolveBuiltinPart`。这是一个极易踩坑的地方。
Builtin 资产在内存中（硬编码在代码里），Project 资产在磁盘上。如果 `PartResolverPort` 的实现不统一，Kernel 就要写 `if (isBuiltin)` 的分支，这违反了依赖倒置。
**修正方案**：
让 `PartResolverPort` 的实现对 Kernel 完全透明。在 Runtime 注入时，提供一个组合解析器：
```typescript
const combinedResolver: PartResolverPort = {
  resolvePartRef: async (ref) => {
    const uri = Kernel.parseNamespace(ref); // Kernel 提供纯逻辑解析
    if (uri.scope === 'builtin') return BuiltinArsenal.get(uri.name); // 内存查找
    return ProjectArsenal.get(uri.name); // 触发 Infra IO
  }
}
```
---
### 📝 对 Open Questions 的终局裁决
| 问题                                   | 裁决                                          | 理由                                                                                                           |
| -------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **1. `cli/draft.ts` 是否完全废弃？**   | **保留为 Thin Wrapper**                       | CLI 作为 Runtime 的一部分，应只负责参数接收和调用 `arsenals/forge.ts`，不应包含任何资产生成逻辑。              |
| **2. Port 的注入点在哪里？**           | **在 Runtime (CLI/Daemon) 层**                | 符合宪法：“Runtime 组装一切，注入 Contract”。Kernel 只管要，Runtime 负责给。                                   |
| **3. `resolveBuiltinPart` 是否保留？** | **逻辑内聚到 BuiltinArsenal，对 Kernel 透明** | Kernel 不关心资产在内存还是在磁盘，只通过 Port 拿 `PartDefinition`。内存/磁盘的寻址差异由 Arsenal 层内部吸收。 |
---
### 🏁 最终审查结论
**有条件通过**。
Spec 的大方向完全正确，但在实施 Phase 3 和 Phase 4 时，必须严格遵守以下原则：
1. **Kernel 的 Port 接口必须纯净**：绝不能出现 `projectBoundary` 这种物理路径参数。
2. **`oxn-dsl` 绝不能沦为新的 IO 洼地**：逻辑解析归 Kernel，物理加载归 Arsenal+Infra。
3. **组合优于条件分支**：Builtin 和 Project 资产的差异在 Runtime/Arsenal 层通过组合 Resolver 消化，Kernel 绝不感知。
按此修正后，这次重构将成为 OpenXenon 彻底落实三层架构宪法的标杆战役！


------------------------
## 代号 AI-3 号：

这是一份非常扎实的重构 Spec！它精准地捕捉到了当前代码库与目标架构之间的主要偏差，尤其是在**依赖倒置**和**职责缺失**这两个核心痛点上。
然而，将这份 Spec 放在我们刚刚达成的**“OpenXenon 三层架构宪法”**（Kernel 绝对真空 / Infra 宿主防腐 / Runtime 编排组装）的标尺下衡量，它在**决策细节和边界划分**上仍存在几处危险的模糊地带，特别是对 `oxn-dsl` 的定位和 Port 的归属。
以下是基于架构宪法的深度审查意见：
---
### ✅ 完全赞同的决策
#### 1. Decision 1: 新建 `arsenals/forge.ts`
**审查意见：完全合规。**
- Arsenal 属于 Runtime (L2/L3)，负责资产的静态管理。Draft（草稿）的铸造本质上是“根据模板生成结构化数据”，属于 Arsenal 的职责。
- 将逻辑从 CLI 下沉到 Arsenal，让 CLI 退化为 Thin Wrapper，这是极其正确的层级收拢。
#### 2. Decision 4: 所有 `fs` 操作经由 Infra
**审查意见：完全合规，必须严格执行。**
- `promoter.ts` 和 `cli/draft.ts` 直接使用原生 `fs` 是对 Infra 防腐层的穿透。
- 既然 Arsenal 和 CLI 都属于 Runtime，它们**必须**通过 Infra 提供的接口（或重新导出的能力，如 `infra/fs`）来执行 IO。
---
### ⚠️ 需要修正与澄清的决策
#### 1. Decision 3: `PartResolverPort` 的物理归属 (严重偏差)
**Spec 提出**：`blueprint-freezer.ts` (Kernel) 通过 `PartResolverPort` 获取解析能力。
**审查意见：方向正确（依赖倒置），但契约归属地错误！**
- Spec 中没有明确 `PartResolverPort` 定义在哪里。如果在 `oxn-dsl/` 或 `work/`，那是**严重违宪**！
- **宪法裁决**：`PartResolverPort` 是 Kernel 向外请求能力的插座，它**必须物理存在于 `kernel/contracts/part-resolver-port.ts`**。
- Kernel 定义插座，Runtime (Work/Arsenal) 提供插头实现，并在启动时注入给 `BlueprintFreezer`。这样才真正实现了 Kernel 的“真空”。
#### 2. Decision 2: `resolvePartRef` 迁移到 `oxn-dsl/scope/` (概念混淆)
**Spec 提出**：将解析逻辑统一到 `oxn-dsl/scope/`。
**审查意见：必须拆解！`oxn-dsl` 不能成为新的逻辑垃圾桶。**
- Part 引用的解析包含两个完全不同的阶段，必须分离：
  - **纯逻辑解析（L0 Kernel）**：将 `oxn://parts/git-commit` 解析为 `{ scope: 'oxn', type: 'parts', name: 'git-commit' }`。这是纯字符串推演，应该留在 `kernel/processors/probes/namespace.ts`（或类似 URI 解析器）。
  - **业务寻址加载（L2 Runtime）**：根据解析出的 scope，去 Builtin/Project/Global Arsenal 找到对应的文件，读取内容并反序列化为 `PartDefinition`。这涉及 IO 和业务优先级，属于 Runtime 层。
- **宪法裁决**：不要把整个 `resolvePartRef` 笼统搬到 `oxn-dsl`。纯 URI 解析归 Kernel Processor，业务加载归 Runtime (实现 `PartResolverPort`)。
---
### 🗝️ 对 Open Questions 的宪法级裁决
#### Q1: `cli/draft.ts` 是否完全废弃？
**裁决：废弃其核心逻辑，保留为 Thin Wrapper。**
- 所有的 Draft 生成逻辑必须收敛到 `arsenals/forge.ts`。
- `cli/draft.ts` 只做一件事：解析命令行参数，调用 `arsenals/forge.ts`，然后通过 Infra 写入文件。它的代码量不应超过 20 行。
#### Q2: Port 的注入点在哪里？CLI 还是 Daemon？
**裁决：都在 Runtime 层，由启动入口注入。**
- CLI 和 Daemon 都是 Runtime 的入口。它们承担着**“组装上帝”**的角色。
- 无论是 CLI 启动还是 Daemon 常驻，在初始化阶段，都必须实例化 Infra 的实现，将其注入到 Kernel 的 Processor 和 Contract 中。
- 具体来说：CLI/Daemon 初始化 `Infra` -> 实例化 `PartResolverPort` 实现 -> 注入 `BlueprintFreezer` -> 调用 `BlueprintFreezer` 的方法。
#### Q3: `influence/part-resolver.ts` 中的 `resolveBuiltinPart` 逻辑是否保留？
**裁决：逻辑保留，但归属重塑为 Arsenal 的内部实现。**
- 我们已经确立了铁律：**BUILTIN 只是“内存版 Arsenal”**。
- `resolveBuiltinPart` 本质上是 `PartResolverPort` 实现中的一部分。当 Runtime 实现 `PartResolverPort` 时，寻址链应该是：`Project Arsenal -> Global Arsenal -> Builtin Arsenal`。
- 所以，`resolveBuiltinPart` 不会被删除，但它不再是 Kernel 或某个孤立模块的特权函数，而是 **Arsenal 优先级链寻址逻辑的一个分支**，被封装在 `PartResolverPort` 的具体实现类中。
---
### 🚨 遗漏的重大技术债务：`PathPort` 的缺失
在 Spec 的背景中提到 `blueprint-freezer.ts` 依赖 `work/part-resolver.ts`，但我们忽略了：**Freezer 在冻结 Blueprint 时，是否需要计算物理路径？**
如果 `blueprint-freezer.ts` 中有任何涉及路径拼接的逻辑（哪怕是推断输出目录），根据我们的宪法，**Kernel 绝不能出现 `path.join` 或路径拼接**。
**补充要求**：在 Spec 中明确，`blueprint-freezer.ts` 如果需要路径计算，必须通过 `kernel/contracts/path-port.ts` 获取能力，由 Infra 注入实现。
---
### 📝 最终审查结论
这份 Spec 是一次极好的外科手术方案，但需要根据宪法进行**微调修正**：
1. **明确 Port 归属**：在 `kernel/contracts/` 下新建 `part-resolver-port.ts`，这是 Kernel 唯一合法的依赖出口。
2. **拆解 DSL 职责**：不要把 `oxn-dsl` 当成避难所，URI 纯解析归 Kernel，业务加载归 Runtime 的 Port 实现。
3. **补全 PathPort**：审查 `blueprint-freezer.ts`，确保所有路径计算均通过 `PathPort` 注入。
**修正这些细节后，这份 Spec 即可作为合法的重构执行蓝图！**
