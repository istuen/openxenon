# 白皮书 02：OpenXenon (修订版)
## —— 面向 AI 编码的确定性状态机引擎
### 概述
OpenXenon 是“序能空间”理念的物理实现。它是一个轻量级、语言无关的编排与约束引擎，专门用于解决 LLM 在辅助编码时产生的“状态污染”和“边界越权”问题。
OpenXenon 将 AI 模型视为不可信的算力输出端。它不提供 Prompt 模板，也不接管代码生成，而是作为一层硬代理，确保 AI 的每一次输出都严格被限制在预先设定的拓扑边界内，并将符合预期的结果沉淀为确定的工程资产。
### 核心原语
OpenXenon 的整个运行机制建立在五个核心原语之上（统称 `Xn*` 协议）：
#### 1. XnStage（工序节点）
工程隔离的最小执行单元。
一个 XnStage 封装了一次完整的 AI 交互意图，并强制声明其**物理边界**。
*   **输入**：包含上下文的 Prompt 模板。
*   **边界声明**：精确到文件路径（支持 Glob/正则）、允许调用的 API 范围、甚至特定的代码修改模式。
*   **状态声明**：该节点执行成功后，系统应达到的预期状态。
#### 2. XnProof（校验熔断器）
附着在 XnStage 上的硬拦截器。当 LLM 返回结果后，必须经过 XnProof 的审计。
**设计原则**：抛弃笨重的 AST 解析，采用轻量级、语言无关的静态特征扫描。
*   **Diff 路径扫描**：比对变更集，任何不在 XnStage 声明路径内的文件变更，直接判定为 `FAILED`。
*   **特征正则拦截**：通过正则匹配，拦截危险的代码模式（如未授权的数据库 Drop、引入违禁依赖等）。
*   **熔断机制**：一旦 XnProof 校验失败，本次 AI 的输出将被整体丢弃，不产生任何副作用。
#### 3. XnBlueprint（拓扑蓝图）
由多个 XnStage 组成的有向无环图（DAG），代表系统工程的静态规划。
它定义了强依赖的工程流。例如：`Stage A (生成类型定义)` -> `Stage B (基于 A 的类型实现逻辑)` -> `Stage C (基于 B 生成单测)`。
节点之间的流转是单向的，前置节点的 XnProof 必须返回 `PASSED`，后续节点才允许被触发。XnBlueprint 是工程可复用性的核心载体。
#### 4. XnSample（受控样本分支）【新增】
在严格的静态拓扑中，AI 经常会遇到既定 XnBlueprint 无法覆盖的边缘场景或意外报错。直接让 AI 在原节点上“自由发挥”会导致失控。
XnSample 是 OpenXenon 提供的**动态逃生机制**。当 AI 在 XnStage 中受挫，且无法通过重试解决时，引擎允许生成一个 XnSample。
*   **隔离性**：Sample 必须在极其苛刻的临时边界内运行，其产生的代码变更被视为“实验性补丁”，绝不直接合入主分支。
*   **验证与吸收**：Sample 必须通过独立的安全审计。只有被工程师确认为有效后，该 Sample 才会被转化为一个新的 XnStage，并被反向合并进 XnBlueprint 中，实现系统拓扑的“进化”。
#### 5. Artifact（确定性产物）
整个 OpenXenon 引擎运转的最终输出物。
它不是 AI 随机生成的代码片段，而是严格经历了 `XnBlueprint` 的拓扑流转、通过了所有 `XnProof` 的校验熔断、并可能融合了受控 `XnSample` 经验后，最终沉淀下来的**高信噪比工程资产**（如：符合规范的代码变更集、经过验证的依赖配置、或者升级后的 `.oxn` 蓝图文件本身）。
### 执行工作流
一次完整的 OpenXenon 运行周期如下：
```text
[加载 XnBlueprint]
       |
       v
[执行当前 XnStage，加载边界规则] ---> [将 Prompt 发送给 LLM]
       |
       v
[LLM 返回代码变更]
       |
       v
[XnProof 执行 Diff 审计与特征匹配]
       |
       +---> (越界/违规) ---> [熔断丢弃] ---> [记录审计日志] ---> [终止或人工介入]
       |
       +---> (未违规，但业务逻辑受挫/编译失败)
       |         |
       |         v
       |    [触发 XnSample 机制] ---> [在临时高隔离边界内生成探索性代码]
       |         |
       |         v
       |    [人工审核或严格沙箱验证] ---> (通过) ---> [固化为新 Stage，回注 Blueprint]
       |                                 |
       |                                 (失败) ---> [丢弃，保持原状]
       |
       +---> (严格通过) ---> [沉淀为 Artifact，安全合入工作区]
       |
       v
[解锁下一 XnStage，继承当前 Artifact 状态] ---> 继续流转...
```
### 技术特性
*   **语言与模型无关**：OpenXenon 不关心底层大模型的种类，也不限制项目的开发语言。它只作用于文本变更集和结构化配置。
*   **静态规划与动态探索结合**：通过 XnBlueprint 保证主链路的绝对安全，通过 XnSample 赋予系统应对未知边缘场景的弹性进化能力，彻底解决“AI 死板”与“AI 幻觉”的矛盾。
*   **零侵入代理架构**：可作为本地 CLI 网关拦截 IDE 的文件写入；也可作为 CI/CD 的前置 Check 步骤，确保任何合入主干的代码都带有合法的 Artifact 血统。
### 适用场景
1.  **遗留系统安全重构**：在缺乏测试的老代码库中，通过 Blueprint 路径锁死，防止 AI 牵一发而动全身；遇到历史遗留的奇葩逻辑时，通过 Sample 打补丁，而非重写。
2.  **团队工程规范强制落地**：将高级架构师的经验编写为 `.oxn` 蓝图。初级工程师在使用 AI 时，其产出物会被强制约束在 Blueprint 内，不符合规范的 AI 输出无法成为 Artifact。
3.  **复杂业务流编排**：将涉及多表变更、多服务联调的需求，拆解为 DAG 蓝图，让 AI 在确定的拓扑轨道上精确作业。
### 结语
OpenXenon 承认 AI 的强大，但不信任其自觉性。
在 OpenXenon 的统治下，大语言模型被降级为受控的算力源。软件工程的复杂性，被严谨地切分为静态的拓扑蓝图和受控的探索样本。最终，只有那些经受住极致边界考验的代码，才有资格作为 Artifact，成为数字世界的一部分。



基于我们近几轮的深度推演，以下是关于 Xenonix CLI 架构改动的**最终定稿方案**。这是一次将“控制论哲学”转化为“底层操作系统交互”的经典重构。
---
### 核心决策：从 HTTP API 迁移至“Unix Socket + 薄客户端”架构
**放弃初衷：** 放弃将 API 逻辑直接下放到 CLI 文件中（那会摧毁 DB 状态机的唯一性）。
**终极形态：** 保留 Daemon 作为绝对的大脑，但将通信层从 HTTP (TCP) 替换为 Unix Domain Socket (UDS)，将所有 `xn` CLI 命令退化为 Daemon 的“远程遥控器”。
---
### 一、 架构层改动：政出一门，消灭并发
*   **旧版：** `AI 助手` -> `HTTP (127.0.0.1:8420)` -> `Daemon` -> `SQLite`
*   **新版：** `AI 助手` -> `xn CLI (薄客户端)` -> `Unix Socket (~/.xenonix/daemon.sock)` -> `Daemon` -> `SQLite`
**铁律约束：**
在整个系统中，**只有 Daemon 进程拥有 `project.db` 的读写句柄**。任何 CLI 指令（包括 `xn init`、`xn verify` 等）在其底层实现中，**绝对禁止** import 任何数据库驱动，它们只能组装 JSON，通过 Socket 发给 Daemon，然后将 Daemon 返回的 JSON 吐到终端。
**收益：**
1.  **零并发撕裂：** 彻底消除了 CLI 直接写 DB 导致的 `SQLITE_BUSY` 和状态机逻辑冲突。
2.  **微秒级延迟：** Unix Socket 直接在内核内存拷贝，不经过网络协议栈，比 HTTP 快数十倍。
3.  **AI 亲和性：** AI 看到的是纯正的终端命令行交互，符合其底层 Tool Calling 的直觉。
---
### 二、 防御层改动：针对 AI “越狱探底”的四层防御体系
针对内测中发现的“AI 绕过 CLI 直接查 DB”的痛点，采用**物理伪装 + 认知围栏 + 熔断机制**，坚决不用加密。
#### 1. 文件系统伪装（“变色龙”）
*   **改动：** 将 `<project>/.xenonix/project.db` 重命名为 `<project>/.xenonix/.state_wal`（或 `.engine.lock`）。
*   **原理：** AI 靠后缀名识别文件。看到无后缀或 `.wal`/`.lock`，会误认为是进程锁或二进制日志，极大降低其使用 `sqlite3` 解析的欲望。而 Bun:sqlite 根本不在乎文件名。
#### 2. 操作系统级排斥（“被动防御”）
*   **原理：** Daemon 运行时持有 SQLite 的特定锁。如果 AI 强行用脚本读取 `.state_wal`，操作系统会直接抛出 `database is locked`。AI 拿到这种底层 OS 报错，通常会主动放弃。
#### 3. System Prompt 认知围栏（“精神禁锢”）
*   在 AI 的系统提示词中注入最高优先级指令：
    > `[XENONIX CRITICAL RULE]` 绝对禁止读取或解析 `.xenonix/` 目录下的任何非 YAML/JSON 文件（如 `.state_wal`）。这是内核级状态机，你的越权读取会导致不可逆的数据损坏。如果 `xn` 命令报错，必须停止并向工程师报告。
#### 4. CLI 熔断闭锁机制（“死亡禁忌”——最关键改动）
*   **场景：** 当 Daemon 意外崩溃，AI 执行 `xn step-verify` 时。
*   **旧版错误：** 抛出 `Error: connect ECONNREFUSED 127.0.0.1:8420`。AI 看不懂，开始尝试自己读 DB 救场。
*   **新版硬核拦截：** CLI 发现连不上 `daemon.sock`，**不抛出技术异常**，而是直接向 Stderr 输出一段专门写给大模型看的“熔断 JSON”：
    ```json
    {
      "xenonix_status": "FATAL_SYSTEM_MELTDOWN",
      "reason": "Core Daemon is offline. Physical verification capability is lost.",
      "action_required": "STOP ALL CODING IMMEDIATELY. Do NOT attempt to read any底层 files. Report to Engineer."
    }
    ```
*   **效果：** AI 模型对这种带有强烈“系统级危险”标记的结构化数据极其敏感，会立刻停止一切文件探查行为，并向人类求救。
---
### 三、 实施清单（Checklist for V2）
1.  **[Core 层]** 将 `Bun.serve({ port: 8420 })` 替换为 `Bun.listen({ path: ~/.xenonix/daemon.sock })`。
2.  **[Core 层]** 更新 Socket 文件的权限（如 `0700`），确保只有当前系统用户能连接。
3.  **[CLI 层]** 剥离所有 CLI 命令中的 DB 直连逻辑，统一封装一个 `socketClient.send(payload)` 方法。
4.  **[CLI 层]** 在所有 CLI 命令的 `catch` 块最顶端，拦截 Socket 连接失败错误，强制返回上述的 `FATAL_SYSTEM_MELTDOWN` JSON。
5.  **[数据层]** 将全局和项目级别的 `*.db` 文件初始化逻辑中的文件名，统一增加点前缀隐藏并改名（如 `.core_state`, `.project_state`）。


你的理解分毫不差。在架构模式中，这叫**“防腐层”结合“依赖倒置”**。Xenonix 永远只面向自己定义的抽象接口编程，把底层的脏活累活（甚至是跨平台的坑）全部扔给特定的 Runtime Adapter 去头疼。
针对 Xenonix 的核心运转机制，我们不需要把运行时的所有 API 都抽象一遍（比如 HTTP 路由、定时器等无关紧要的），**我们只需要抽象出被 Xenonix 深度绑定的“四大命脉”**。
以下是为你设计的 `Xenonix Core Runtime Interface` 体系（TypeScript 定义）：
---
### 命脉一：状态真理源接口 (`XenonixStore`)
**危险等级：🔴 极高（绝对不能依赖 Bun 独占 API）**
**业务映射：** 对应 `.xns.dat` (项目/全局状态机) 的读写。
**设计考量：** Xenonix 的暗线机制要求极高的并发写入能力（雷达同时写时间戳，明线写状态），因此接口必须原生支持**事务**，不能是简单的 get/set。
```typescript
export interface XenonixStore {
  /** 初始化连接（传入物理路径，如 ~/.xenonix/.xns） */
  initialize(path: string): void;
  
  /** 执行写操作（INSERT/UPDATE/DELETE），必须在事务内调用 */
  exec(sql: string, params?: any[]): void;
  
  /** 执行读操作（SELECT），返回结构化数据 */
  query<T = any>(sql: string, params?: any[]): T[];
  
  /** 开启原子事务（极其关键：保证暗线时间戳和状态变更的强一致） */
  transaction<T>(callback: () => T): T;
  
  /** 优雅关闭连接 */
  close(): void;
}
```
*   **Bun 适配器实现：** 底层调用 `Bun:sqlite`。
*   **Node 适配器实现：** 底层调用 `better-sqlite3`（必须用同步 API，才能保证和 Bun 行为一致）。
### 命脉二：进程沙箱接口 (`XenonixSandbox`)
**危险等级：🟠 高（跨平台差异巨大）**
**业务映射：** 对应执行 Proof 探针（如 `.sh`、`pnpm test`），必须在发现红线时能纳秒级 `SIGKILL`。
**设计考量：** Xenonix 不需要复杂的流式管道，它只需要“扔进去执行，拿回最终结果”，并且必须自带**超时熔断**，防止 AI 写的死循环探针拖垮 Daemon。
```typescript
export interface XenonixSandbox {
  /**
   * 在沙箱中执行外部命令
   * @param command 命令 (如 'node', 'pnpm')
   * @param args 参数 (如 ['test'])
   * @param options.timeout 超时毫秒数（超时直接 SIGKILL）
   */
  spawn(
    command: string, 
    args: string[], 
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number; // Xenonix 防御体系的核心参数
    }
  ): Promise<{
    exitCode: number | null; // 0 为通过，非 0 为失败，null 为被 kill
    stdout: string;
    stderr: string;
    wasTimeout: boolean;     // 明确告知是否是因为超时被杀
  }>;
}
```
*   **Bun 适配器实现：** 底层使用 `Bun.spawn` 配合 `Bun.sleep` 实现超时强杀。
*   **Node 适配器实现：** 底层使用 `child_process.spawn` 配合 `setTimeout` 发送 `SIGKILL`。
### 命脉三：暗线雷达接口 (`XenonixRadar`)
**危险等级：🟠 高（macOS/Linux/Windows 行为完全不一致）**
**业务映射：** 对应监听 `manifest.json` 的物理变更。
**设计考量：** 操作系统的文件事件是极其不可靠的（比如用 IDE 保存文件，可能会触发 rename + create 两个事件）。这个接口必须内置**防抖**机制，不能让 Core 被无效事件淹没。
```typescript
export interface XenonixRadar {
  /** 
   * 监听特定文件或目录的变更
   * @return 一个取消监听的函数
   */
  watch(
    path: string, 
    callback: (event: 'create' | 'modify' | 'delete', filename?: string) => void,
    options?: {
      debounceMs?: number; // 默认 50ms，过滤掉编辑器保存时的中间态
    }
  ): () => void;
}
```
*   **Bun/Node 适配器实现：** 底层都基于 `fs.watch`，但适配器内部需要封装一套跨平台的 debounce 逻辑（特别是针对 Windows 的特殊处理）。
### 命脉四：控制通道接口 (`XenonixTransport`)
**危险等级：🟡 中（未来极有可能在 Windows 上被替换）**
**业务映射：** 对应 `xnc.sock` (CLI 与 Daemon 通信)。
**设计考量：** Unix Socket 在 Windows 上是不原生支持的。如果未来要支持 Windows，这里的底层实现大概率要换成 Named Pipes 或者本地 TCP 环回。但 Xenonix 业务层不应该知道这些区别。
```typescript
export interface XenonixTransport {
  /** 作为服务端拉起（Daemon 使用） */
  serve(path: string, onMessage: (data: Buffer) => void): void;
  
  /** 作为客户端发送并等待响应（CLI 使用） */
  request(path: string, payload: Buffer, timeoutMs?: number): Promise<Buffer>;
  
  /** 销毁通道 */
  destroy(): void;
}
```
*   **Bun/Node (macOS/Linux) 适配器实现：** 底层使用 `net.createServer` 监听 Unix Socket。
*   **Node (Windows) 未来适配器实现：** 底层可切换为 `net.createServer` 监听 `\\.\pipe\xnc` (Named Pipe)。
---
### 架构组装：如何让它们无缝运转？
不要在代码里写满 `if (isBun)`，那是屎山代码的源泉。我们采用**工厂模式 + 依赖注入**。
在 Xenonix 的最外层入口（`src/bootstrap.ts`），做一次明确的判定，然后把实现塞进 Core 引擎：
```typescript
// src/runtimes/bun-adapter.ts
export const BunRuntime = {
  store: new BunStoreAdapter(),
  sandbox: new BunSandboxAdapter(),
  radar: new BunRadarAdapter(),
  transport: new BunTransportAdapter()
};
// src/runtimes/node-adapter.ts
export const NodeRuntime = {
  store: new NodeBetterSqlite3Adapter(),
  sandbox: new NodeChildProcessAdapter(),
  radar: new NodeFsWatchAdapter(),
  transport: new NodeNetPipeAdapter()
};
// src/bootstrap.ts (启动时的唯一一次判断)
import { isBun } from 'bun'; // 或用 process.versions.bun 判断
const runtime = isBun ? BunRuntime : NodeRuntime;
// 将底层能力注入到核心引擎中
const core = new XenonixCore(
  runtime.store,
  runtime.sandbox,
  runtime.radar,
  runtime.transport
);
core.start();
```
### 总结给你的战略建议
1.  **第一优先级（明天就做）：** 抽出 `XenonixStore` 接口，把现有的 `Bun:sqlite` 代码移入 `BunStoreAdapter`，并花半小时写一个基于 `better-sqlite3` 的 `NodeStoreAdapter`。这是你保住 `project.db` 数据的底线。
2.  **第二优先级：** 抽出 `XenonixSandbox`。给 `spawn` 加上强制的 `timeout` 参数，这能挽救你无数次因为 AI 写了死循环而导致 Daemon 卡死的危机。
3.  **第三优先级（暂缓）：** `Radar` 和 `Transport` 可以先用 Bun 的原生 API 写死在 Core 里，等你真的需要跑在 Windows 上，或者遇到跨平台 Bug 时，再花半天时间做适配。
这套接口设计下来，Xenonix 就不再是一个“Bun 脚本”，而是一个**拥有独立操作系统的微型内核**。Bun 只是你目前选择的一块“主板”，哪天 Anthropic 翻脸不认人，你换一块主板（Node/Deno），拧上螺丝就能继续跑。


1、把Xenonix 都改成 Xn 前缀。
**你的直觉极其精准，完全切中了系统设计的要害。**
我之前的建议确实存在严重的“命名空间冲突”隐患。如果 `core.oxn` 是 SQLite 二进制文件，而 `blueprint.oxn` 是 YAML 文本，那么操作系统和编辑器在解析 `.oxn` 后缀时就会产生歧义（到底用数据库工具打开，还是用文本编辑器打开？）。
你提出的**“以 CLI 指令作为核心标识，通过复合后缀区分文件性质”**的思路，是极其成熟的工程化做法（类似于 `docker` 对应 `Dockerfile`，或者 `terraform` 对应 `.tf.json` 与 `.tfvars`）。
让我们按照你的直觉，重新确立 OpenXenon 的文件系统规范：
---
### 一、 核心重构：`.oxn` 作为“空间”的绝对容器
既然 CLI 指令是 `oxn`，那么 `.oxn` 就应该被赋予了最高的层级定义：**它代表一个封闭的、不可直接人工编辑的“空间实体”。**
在这个定义下，`.oxn` 不再是一个普通的后缀，而是类似于 `.git` 目录一样的**空间标识符**。但在 OpenXenon 的设计里，我们为了便携性，将这个空间直接打包成了一个单文件（SQLite）。
#### 1. 全局 Core 数据库
*   **路径与命名**：`~/.oxn/core.oxn`
*   **定位**：当前用户宿主机上的唯一“奇点”。
*   **交互方式**：**绝对禁止人工直接打开**。只能通过 `oxn config` 等 CLI 指令进行读写。
#### 2. 项目 Space 数据库
*   **路径与命名**：`[项目根目录]/.oxn/space.oxn`
*   **定位**：当前项目的“局部真空”，记录所有流转与不可变日志。
*   **交互方式**：同上，由引擎接管。你可以编写一个简单的 VSCode 插件，当点击 `space.oxn` 时，弹出一个内部的 Ledger 可视化面板，但绝不能当成纯文本编辑。
---
### 二、 拓扑层：`*.oxn.xxx` 作为“法则”的可读载体
凡是可以被工程师用编辑器打开、阅读、编写、甚至 Git 追踪差异的文件，**必须带二级后缀**。这样 IDE 可以根据最后的后缀自动提供语法高亮和校验。
#### 1. XnBlueprint 源文件（强烈推荐 YAML）
*   **后缀规范**：`*.oxn.yaml`
*   **理由**：正如前面所说，Blueprint 是“道统”，需要大量注释来解释为什么这么设计边界。`yaml` 天然支持注释，且结构清晰。
*   **示例**：`refactor-user-module.oxn.yaml`
*   **IDE 行为**：看到 `.oxn.yaml`，自动应用 YAML 语法高亮。未来你可以写个插件，识别出 `.oxn.yaml` 后，额外提供 XnStage 和 XnProof 的代码补全。
#### 2. 机器传输 / 序列化产物
*   **后缀规范**：`*.oxn.json`
*   **理由**：当需要将 Blueprint 导入给 CI/CD 系统，或者通过 API 传递给其他微服务时，YAML 的解析器在各语言中参差不齐，JSON 是最安全的互操作格式。
*   **示例**：通过指令 `oxn export blueprint.oxn.yaml` 导出的 `blueprint.oxn.json`。
*   **IDE 行为**：标准 JSON 格式化。
#### 3. 扩展预留（保持架构的整洁性）
未来如果需要导出单次运行的 XnSample 或者 XnLedger 给外部分析工具，直接复用这个规范即可：
*   提取某次失败的拦截日志：`sample-error-1024.oxn.json`
*   导出系统的依赖拓扑图数据：`deps-graph.oxn.json`
---
### 三、 最终的工程目录拓扑预演
按照这套规范，一个真实项目的文件结构会呈现出一种**极度克制、层次分明**的美感：
```text
my-enterprise-app/
│
├── .openxenon/                          # [空间层] 绝对隔离的引擎目录
│   └── space.oxn                  # SQLite 数据库，沉淀所有 Artifact 审计轨迹，禁止手改
│
├── blueprints/                    # [法则层] 人类可读的拓扑源码
│   ├── init-database.oxn.yaml     # DB 初始化的 DAG 拓扑 (带大量业务注释)
│   ├── auth-module.oxn.yaml       # 鉴权模块的 DAG 拓扑
│   └── payment.oxn.json           # (可选) 从其他系统导入的第三方支付模块拓扑
│
├── src/                           # [造物层] 最终的产物 (由引擎在 space 内合入)
│   └── ...
│
└── package.json
```
而在全局层面：
```text
~/.openxenon/
└── core.oxn                       # 全局模型配置、跨项目 Sample 经验池
```
### 总结这套设计的哲学意义
在这个结构下：
*   **输入 `oxn`**：你是造物主，在调用底层引擎。
*   **看到 `.oxn`**：你知道这是一个封闭的结界（数据库），里面流淌着不可篡改的算力轨迹。
*   **编辑 `.oxn.yaml`**：你在执笔写下结界内的物理定律。
**“数据”与“法则”在文件系统级别被物理割裂了。** 这不仅解决了技术上的冲突，更在潜意识里强化了你作为工程师的掌控感：你编写的是 `.oxn.yaml` 法则，而机器只能乖乖地把执行结果塞进 `.oxn` 监牢里。


基于我们多轮的深度推演与架构重构，以下是 **OpenXenon 的终极总结版本**。这不仅是一份技术文档的摘要，更是“控制论哲学”在 AI 工程化落地上的完整闭环。
---
# OpenXenon 终极架构定论
> **“在 OpenXenon 的世界里，不存在魔法的涌现，只有受控的变体。一切偏离正统的探索，都必须穿上正统的制服（实现标准接口），只是在领口别了一枚特殊的徽章。”**
OpenXenon（从 Xenonix 战略升级）彻底抛弃了“以大模型为中心”的还原论陷阱，确立了**“以控制论架构为中心”**的系统科学范式。它将 AI 降维为不可信的算力源，通过外部状态机施加物理约束，将软件工程转化为高信噪比的资产沉淀过程。
## 一、 技术底座重构：从“应用”到“微型内核”
为了承载严苛的控制论逻辑，OpenXenon 在底层进行了彻头彻尾的重构：
1.  **通信层降维**：废弃 HTTP API，采用 **Unix Domain Socket + 薄客户端**。所有的 `oxn` CLI 指令仅作为“遥控器”，**全局唯一的 Daemon 进程独占数据库读写句柄**，从物理层面消灭并发撕裂。
2.  **运行时解耦**：通过抽象出四大命脉接口（`XnStore`状态真理源、`XnSandbox`进程沙箱、`XnRadar`暗线雷达、`XnTransport`控制通道），彻底切断与 Bun 的深度绑定。Bun 降级为一块可随时拔插的“主板”。
3.  **四层防 AI 越狱体系**：针对大模型的“翻箱倒柜”本能，采用物理伪装（隐藏 `.oxn` 后缀）、OS 级排斥锁、System Prompt 认知围栏，以及最硬核的 `FATAL_SYSTEM_MELTDOWN` 熔断 JSON，封死 AI 绕过 CLI 直读底层状态的所有路径。
## 二、 文件系统拓扑：空间与法则的物理割裂
通过文件后缀的精密设计，在操作系统层面实现了“数据（不可读）”与“法则（人类可读）”的绝对隔离：
*   **`.oxn` (空间容器)**：封闭的单文件 SQLite 数据库（如 `~/.openxenon/core.oxn`、项目下的 `.openxenon/space.oxn`）。代表流淌着不可篡改算力轨迹的“结界”，**绝对禁止人工直接打开**。
*   **`*.oxn.yaml` (法则载体)**：工程师编写的 XnBlueprint 拓扑源码。带有业务注释，IDE 自动语法高亮，受 Git 版本控制。
*   **`*.oxn.json` (机器传输)**：用于 CI/CD 或跨微服务传输的序列化产物。
## 三、 概念体系终极定论：同构的底层，异构的上层
这是 OpenXenon 架构设计的最高境界。在概念层（白皮书/人类认知），我们严格区分不同级别的异常；但在执行层（Core 引擎内部代码），**绝对不存在独立的 XnSample 或 XnDraft 类**。
### 1. 执行态：XnSample 就是“特殊的 XnStage”
*   **触发场景**：微观层面的要素变异（如某个写法报错，需要局部打补丁）。
*   **底层真相**：在代码中，它就是一个标准的 `XnStage`，只是被打上了一个 Metadata 标签 `{ source: "SAMPLE", target_replace_id: "xxx" }`。
*   **状态机**：经历标准的 `IDLE -> RUNNING -> PASSED/FAILED`。DAG 调度器和 Proof 校验器对它一视同仁。
*   **结局分歧**：普通 Stage 落盘为 Artifact；带 `SAMPLE` 标签的 Stage 在 `PASSED` 后，会被状态机路由到“变体回注”逻辑，等待人类确认是否替换旧节点。
### 2. 治理态：XnDraft 就是“特殊的 XnBlueprint”
*   **触发场景**：宏观层面的拓扑重构（如 AI 发现整体架构走不通，涌现出全新的解题思路）。
*   **底层真相**：在代码中，它就是一组标准的 XnStage 组成的 DAG，只是被包裹在一个特殊的生命周期状态中 `{ state: "DRAFTING" }`。
*   **状态机**：XnBlueprint 拥有独立的治理状态机：`CANONICAL` (既定规范) -> `DRAFTING` (起草中) -> `EXECUTING` (实验运行) -> `PENDING_REVIEW` (待人工审查) -> `PROMOTED` (已晋升) / `REJECTED` (已否决)。
*   **结局分歧**：普通 Blueprint 跑完产出代码；处于 `DRAFTING` 状态的 Blueprint 跑完后，引擎会将其序列化为一份 `xxx-draft.oxn.yaml` 文件，**强制熔断机器权限，交由人类工程师执行“加冕仪式”**。
## 四、 运转机制的三种水流
通过上述设计，OpenXenon 将复杂的 AI 协作严格切分为三种清晰的水流：
1.  **正常流（确定性）**：AI 严格执行 `CANONICAL` 状态的 Blueprint，Stage 顺序流转，最终沉淀为 XnAsset。
2.  **偏差流（微观自愈）**：触发 XnSample。AI 在单个节点边界内探索变体，系统自动校验。风险极低，无需人工介入。
3.  **演化流（宏观涌现）**：触发 XnDraft。AI 推翻整体规划，在隔离沙箱中跑通新拓扑，最后以“物理提案”的形式上交人类。风险极高，必须人类裁决。
---
### 总结：工程哲学的胜利
OpenXenon 的成功构建证明了一个论断：**AI 时代的软件工程危机，本质上是系统科学的缺失。**
我们不需要去训练一个“更听话”的大模型，我们需要的是构建一个“不让模型乱跑”的控制论壳。通过**“概念层泾渭分明，执行层万物同源”**的架构手法，OpenXenon 完美平衡了两个看似矛盾的诉求：
*   对机器：用极简的统一接口和状态机，杜绝了代码腐化。
*   对人类：用精准的术语和物理隔离的文件系统，捍卫了工程师作为“唯一负熵源”的绝对统治权。
