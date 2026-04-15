# Proof 系统架构文档

## 概述

Xenonix 的 Proof 架构是整个工程体系的**安全命脉**。它提供了一套物理封印的、不可篡改的原子验证探针系统，确保 AI 执行结果的真伪可被绝对可信地判定。

## 核心设计原则

**"底层物理定律必须被封印在二进制体内，暴露在文件系统上的只能是允许被修改的业务契约。"**

## 物理隔离与定性

### 内置探针（Built-in Proofs）—— 物理封印

**存储形式**：硬编码在 Core 的 TypeScript 源码中，编译时利用 Bun 的打包能力直接熔铸进单一二进制文件内部。

**安全意义**：
- AI 无法看到源码、无法修改、无法在文件系统中寻址
- 构成绝对可信的验证基石
- 无文件 IO，零篡改可能

### 自定义探针（Custom Proofs）—— 契约执行

**存储形式**：
- **项目级**：`<project>/.xenonix/proofs/` 目录下的 `.ts` 文件
- **全局级**：`~/.xenonix/custom-proofs/` 目录下的 `.ts` 文件

**安全意义**：
- 视为不可信的外部契约
- 通过 `Bun.spawn` 隔离子进程执行
- 参数通过 stdin 传递，仅收割进程退出码

## 三段式降级查找逻辑

当 AI 在 Playbook 中提交 `requested_proof` 时，Core 执行严格的优先级判定：

```
1. 内置探针（内存字典）
   └─> 直接在二进制内存中调用底层引擎执行

2. 项目级自定义（业务特定区）
   └─> 在 `<project>/.xenonix/proofs/` 查找并隔离执行

3. 全局级自定义（通用扩展区）
   └─> 在 `~/.xenonix/custom-proofs/` 查找并隔离执行

4. 终极熔断
   └─> 返回 ProofNotFoundError，判定 Step 为 FAILED
```

## 四层物理现实（L1-L4）

### L1：文件系统层 —— 存在与结构

最廉价、最快、最无副作用的探测，用于拦截 AI 的"遗忘幻觉"。

| 探针名称 | 功能 | 输入参数 |
|---------|------|---------|
| `fs_exists` | 文件存在性探测 | `path` |
| `fs_not_exists` | 文件不存在性探测 | `path` |
| `fs_content_match` | 内容正则匹配探测 | `path`, `pattern` |
| `fs_parseable` | 语法可解析探测 | `path`, `parser` |

### L2：进程执行层 —— 行为与因果

核心层，用于拦截 AI 的"逻辑幻觉"。

| 探针名称 | 功能 | 输入参数 |
|---------|------|---------|
| `exec_exit_zero` | 进程零退出码探测 | `command`, `cwd?` |
| `exec_stdout_match` | 标准输出匹配探测 | `command`, `pattern`, `cwd?` |

### L3：运行时状态层 —— 数据与现实

用于验证 AI 对数据库、缓存、环境等外部状态的改变。

| 探针名称 | 功能 | 输入参数 |
|---------|------|---------|
| `db_query_bool` | 数据库标量查询探测 | `connection`, `sql` |
| `env_exists` | 环境变量探测 | `key` |

### L4：网络拓扑层 —— 连通与可达

用于微服务或 API 开发场景。

| 探针名称 | 功能 | 输入参数 |
|---------|------|---------|
| `http_status` | HTTP 状态码探测 | `url`, `method?`, `expected_status`, `headers?` |

## 安全边界

### 绝对禁止的"伪格"

以下类型的探针**永远不准**进入系统：

- ❌ **`llm_judge`**：大模型评判 —— 自欺欺人
- ❌ **`complex_business_logic_check`**：复杂业务逻辑校验 —— 超出原子探测范畴
- ❌ **`code_style_score`**：代码风格评分 —— 必须是布尔判定，不能是模糊评分

### 布尔绝对性

所有探针的输出**必须**是绝对的布尔值：
- ✅ `0` 或 `1`
- ✅ `PASS` 或 `FAIL`
- ❌ 无灰度，无中间状态

## CLI 使用

### 查看所有可用探针

```bash
xn proof-list
xn proof-list --format json
xn proof-list --project /path/to/project
```

### 输出示例

```
Available Proofs
================

Built-in Proofs [built-in]:
---------------------------
  - fs_exists (L1)
    Check if a file or directory exists on the filesystem
  - fs_not_exists (L1)
    Check if a file or directory does not exist on the filesystem
  - fs_content_match (L1)
    Check if file content matches a regex pattern
  ...

Project-level Custom Proofs [project]:
---------------------------------------
Path: /path/to/project/.xenonix/proofs

  - my_custom_proof

Summary:
--------
Total proofs: 13
  Built-in: 9
  Project: 1
  Global: 3
```

## 扩展性

### 编写自定义探针

1. 创建 `.ts` 文件：
   ```typescript
   // .xenonix/proofs/my_custom_proof.ts
   
   interface ProofInput {
     param1: string
     param2?: number
   }
   
   interface ProofOutput {
     success: boolean
     message?: string
   }
   
   // 从 stdin 读取输入
   const inputJson = await Bun.stdin.text()
   const input: ProofInput = JSON.parse(inputJson)
   
   // 执行验证逻辑
   const result: boolean = validateMyCondition(input)
   
   // 通过退出码返回结果
   process.exit(result ? 0 : 1)
   ```

2. 放置到正确位置：
   - 项目级：`<project>/.xenonix/proofs/`
   - 全局级：`~/.xenonix/custom-proofs/`

3. 在 Playbook 中使用：
   ```yaml
   proofs:
     - name: my_custom_proof
       input:
         param1: "value"
         param2: 42
   ```

## 实现细节

### 核心文件

- `src/types/proof.ts` - 类型定义和错误类型
- `src/core/built-in-proofs-registry.ts` - 内置探针注册表
- `src/core/built-in-proofs/` - 12 个原子探针实现
- `src/core/custom-proofs-scanner.ts` - 自定义探针扫描器
- `src/verification/custom-proof-executor.ts` - 自定义探针隔离执行器
- `src/core/proof-dispatcher.ts` - 三段式降级查找调度器
- `src/core/proof-blacklist.ts` - 伪格探针黑名单
- `src/core/proof-parameters.ts` - 参数验证系统

### 编译与部署

内置探针在编译时通过 `bun build --compile` 熔铸进单一二进制文件，确保：
- 不可在文件系统中寻址
- 无法被 AI 篡改
- 执行零文件 IO

## 总结

Xenonix 的 Proof 架构是一个**"白盒自定义 + 黑盒内置"**的双层沙箱模型：
- **白盒**：业务校验权开放给文件系统（通过 `.ts` 文件扩展）
- **黑盒**：底层物理校验权封印在 Core 二进制中（不可动摇）

这种设计既保证了系统的无限扩展性，又捍卫了系统不被动摇的绝对底线。
