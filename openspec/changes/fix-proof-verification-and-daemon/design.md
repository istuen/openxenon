## Context

三个问题的详细分析：

### 问题 1：Daemon 启动路径

当前代码：
```typescript
// src/daemon/process.ts
const proc = Bun.spawn(['bun', 'run', serverPath], {
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore'],
  cwd: process.cwd()
})
```

`serverPath` 由 `src/commands/daemon.ts` 传入：
```typescript
const serverPath = join(process.cwd(), 'src', 'server.ts')
```

问题：用户从任意目录运行 `xn daemon start`，`process.cwd()` 返回当前目录而非 xenonix 安装目录。

### 问题 2：Proof 自动执行

当前 step-verify 流程：
1. 用户提供 stepId + proofPath
2. 系统执行 proofPath 指定的脚本

期望流程：
1. 用户提供 stepId
2. 系统自动从 step.proof 字段获取 proof 名称
3. 系统查找内置 proof 或项目 proof
4. 执行 proof

### 问题 3：Target State 存储

当前 Step 类型：
```typescript
export interface Step {
  id: string
  name: string
  spec: string
  proof: string
}
```

缺少 `target_state` 字段用于存储验证条件。

## Goals / Non-Goals

**Goals:**

- Daemon 可从任意目录启动
- step-verify 自动执行内置 proof
- 支持 target_state 存储

**Non-Goals:**

- 不修改 proof 执行引擎
- 不实现 proof 发现机制（复用现有 proofs-list 逻辑）

## Decisions

### 1. Daemon 启动路径检测

**决定**：使用 `import.meta.dir` 检测模块安装路径。

```typescript
// src/commands/daemon.ts
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const serverPath = join(__dirname, '..', 'server.ts')
```

**理由**：
- `import.meta.dir` 返回模块所在目录
- 无论从哪个目录运行，都能找到正确的 server.ts
- 符合 ESM 标准

### 2. Proof 自动执行

**决定**：step-verify 根据 step.proof 字段自动查找并执行 proof。

```typescript
// step-verify.ts
if (!body.proofPath) {
  // 自动查找 proof
  const proofPath = await findProof(step.proof, projectPath)
  if (!proofPath) {
    return notFound(`Proof '${step.proof}' not found`)
  }
  body.proofPath = proofPath
}
```

**Proof 查找顺序**：
1. 项目 proof：`<project>/.xenonix/proofs/<name>.ts`
2. 全局 proof：`~/.xenonix/proofs/<name>.ts`
3. 内置 proof：`<xenonix>/src/core/built-in-proofs/<name>.ts`

**理由**：
- 复用现有 proof 发现逻辑
- 保持向后兼容（仍支持显式 proofPath）
- 用户无需关心 proof 文件位置

### 3. Target State 存储

**决定**：添加 `target_state` 列到 steps 表。

```sql
ALTER TABLE steps ADD COLUMN target_state TEXT;
```

修改 Step 接口：
```typescript
export interface Step {
  id: string
  name: string
  spec: string
  proof: string
  targetState?: string  // 新增
}
```

**理由**：
- 最小化数据库变更
- target_state 作为可选字段，兼容现有数据

## Risks / Trade-offs

### 风险：数据库迁移

**风险**：现有数据库没有 target_state 列。

**缓解**：使用 `ALTER TABLE IF NOT EXISTS` 或在 initProjectDb 中添加检测逻辑。

### 风险：Proof 查找失败

**风险**：找不到对应的 proof 文件。

**缓解**：返回明确的错误信息，列出可用的 proofs。
