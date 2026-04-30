--------------------------

问：1、我想设计CLI 指令默认对项目级（因为主要工作都集中在这里），然后通过--global 作为全局的操作。
2、一些必须全局操作的指令就是oxn global ** 这样如何。
3、还是说 CLI 默认是全局（即用户层）

答：这是一个极其经典的 CLI 架构设计问题：**作用域的默认锚点应该定在哪里？**
在 Node.js/Bun 生态（如 `pnpm`、`npm`、`tsx`）中，绝大多数工具链的默认锚点都是**项目级**。而在系统级工具（如 `docker`、`git`）中，默认锚点是全局。
对于 OpenXenon，我的坚定建议是：**采用你的第 1 种方案。CLI 默认对项目级生效，使用 `--global`（或简写 `-g`）向上穿透。坚决抛弃第 2 种 `oxn global **` 的设计。**
以下是深度解析为什么这样设计最符合 OpenXenon 的哲学：
---
### 一、 为什么默认必须是“项目级”？
OpenXenon 的核心定义是：“将软件工程转化为高信噪比的资产沉淀过程”。
**沉淀发生在哪里？发生在项目里。**
1.  **符合“工作流心流”**：工程师打开终端，`cd` 到项目目录，敲下 `oxn status`。他期望看到的是**当前这个烂摊子**的 AI 执行状态，而不是汇总了十几个项目的全局报表。默认项目级，最大程度减少了工程师的认知切换成本。
2.  **物理边界的天然映射**：Core 引擎的双层架构中，`~/.openxenon/` 只是一个“空壳注册表”，真正的肉体（`space.oxn`、`Arsenal`、`Task`）全都在 `<project>/.openxenon/` 下。CLI 默认面向当前目录，就是默认面向物理实体。
3.  **AI 助手的适配**：当你在 Cursor 里输入 `/oxn-task` 时，AI 底层调用的 CLI 命令是不带路径参数的。如果 CLI 默认是全局的，AI 还得费劲去获取当前项目的绝对路径传进去。默认项目级，AI 只需要无脑发指令。
---
### 二、 为什么 `--global` 优于 `oxn global **`？
你提出的第 2 种方案（类似 `git remote` 或 `docker context` 的子命令模式）看似清晰，但在 OpenXenon 里会导致**极其恶心的一致性割裂**。
假设采用第 2 种方案：
*   查项目标准：`oxn standard show create-user`
*   查全局标准：`oxn global standard show create-user`
*   推进项目任务：`oxn task run`
*   查看全局守护进程：`oxn global daemon status`
**灾难在于**：你会发现对于 `daemon`（它天生只能是全局的），你每次都得加 `global` 前缀，极其反人类。如果你不加，它又变成了项目级，这在物理上是不可能的。
**而采用 `--global` 标志位的设计，带来的是“统一动词，平滑穿透”的优雅：**
```bash
# 核心动词永远不变，只通过标志位改变作用域
# 默认项目级（90%的使用场景）
oxn status
oxn standard show create-user
oxn trace task-001
# 偶尔向上穿透到全局（10%的使用场景）
oxn --global daemon status   # (虽然 daemon 只能全局，但语法保持一致)
oxn --global standard show eslint-strict  # 查看全局基线探针
oxn --global standard promote draft.md canonical.md  # 将某个探针提升为全局标准
```
这种设计的底层逻辑是：**“全局”并不是一个独立的物理空间，它只是“项目”在作用域上的向上扩大。** `--global` 只是一个寻址路由的修饰符。
---
### 三、 完美的双层寻址 fallback 逻辑（CLI 的灵魂）
既然默认是项目级，那么当工程师在项目里敲命令时，CLI 与 Core 的交互必须遵循一个极其严密的“就近原则”。这直接对应你之前设计的“项目优先，全局兜底”的探针整合策略。
当你执行 `oxn standard show create-user` 时，CLI 向 Core 发送请求，Core 的寻址机械行为必须是：
1.  **查本地**：Core 先看当前项目的 `.openxenon/arsenals/stages/create-user/canonical.md` 是否存在。
2.  **命中**：如果存在，直接返回。**（这说明项目对这个标准进行了局部覆写/微调，具有最高优先级）**
3.  **Fallback 兜底**：如果本地不存在，Core 自动去 `~/.openxenon/arsenals/stages/create-user/canonical.md` 查找。
4.  **未命中**：如果全局也没有，抛出致命错误 `FATAL_STANDARD_NOT_FOUND`。
同样，当你执行 `oxn standard promote` 时：
*   不加 `--global`：只能把 `draft.md` 转正为当前**项目**的 `canonical.md`。
*   加上 `--global`：Core 会把当前项目里打磨好的标准，**物理搬运**到全局的 `~/.openxenon/arsenals/` 下。这就是真正的“从项目实践中提取团队通用标准”。
---
### 四、 唯一的例外：关于 `oxn init` 和 `oxn daemon`
为了保持语法的绝对一致，即使是必须全局操作的指令，也遵循上述规则，只是 Core 在底层做拦截：
*   **`oxn daemon start`**：
    *   工程师在项目里敲这个命令，不需要加 `--global`。
    *   Core 底层逻辑：检测到是 `daemon` 指令，直接忽略项目级上下文，强制操作 `~/.openxenon/daemon.sock`。对外表现出的依然是统一的动词。
*   **`oxn init`**：
    *   默认项目级：在当前目录创建 `.openxenon/` 并向全局注册。
    *   如果你未来想做 `oxn init --global`，那它的语义就变成了：初始化全局的 `~/.openxenon/` 目录本身（比如清理全局缓存、重置全局 DB）。虽然少见，但逻辑自洽。
### 总结
采用 **方案 1（默认项目级 + `--global` 穿透）**。
不要创造 `oxn global` 这个子命令。让 `--global` 成为一个安静但强大的修饰符。这样，OpenXenon 的 CLI 表面上极其简单（只有十几个核心动词），但在底层，它通过目录寻址和标志位，完美操控着那个庞大而冷峻的双层物理围栏。

--------------------------

问：

答：
--------------------------

问：

答：
--------------------------

问：

答：
