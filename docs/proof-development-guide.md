# Proof 开发指南

## 快速开始

### 内置探针使用

Xenonix 提供 12 个原子探针，覆盖文件系统、进程执行、运行时状态和网络拓扑四个物理层。

#### L1 文件系统层示例

```yaml
# 检查文件是否存在
proofs:
  - name: fs_exists
    input:
      path: "src/index.ts"

# 检查文件内容是否匹配
proofs:
  - name: fs_content_match
    input:
      path: "package.json"
      pattern: '"name".*"my-project"'

# 验证 JSON 语法
proofs:
  - name: fs_parseable
    input:
      path: "config.json"
      parser: "json"
```

#### L2 进程执行层示例

```yaml
# 运行测试
proofs:
  - name: exec_exit_zero
    input:
      command: "npm test"

# 检查命令输出
proofs:
  - name: exec_stdout_match
    input:
      command: "npm run lint"
      pattern: "0 problems"
```

#### L3 运行时状态层示例

```yaml
# 检查环境变量
proofs:
  - name: env_exists
    input:
      key: "DATABASE_URL"

# 查询数据库
proofs:
  - name: db_query_bool
    input:
      connection: "postgres://localhost/mydb"
      sql: "SELECT COUNT(*) > 0 FROM users WHERE active = true"
```

#### L4 网络拓扑层示例

```yaml
# 检查 API 端点
proofs:
  - name: http_status
    input:
      url: "http://localhost:3000/api/health"
      method: "GET"
      expected_status: 200
```

## 自定义探针开发

### 1. 创建探针文件

在项目目录 `.xenonix/proofs/` 下创建 `.ts` 文件：

```typescript
// .xenonix/proofs/check_migration.ts

interface MigrationInput {
  tableName: string
  columnName?: string
}

// 从 stdin 读取输入
const inputJson = await Bun.stdin.text()
const input: MigrationInput = JSON.parse(inputJson)

// 执行验证逻辑
const db = new Database('app.db')

let query = `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`
let result = db.query(query).get(input.tableName)

if (!result) {
  console.error(`Table ${input.tableName} does not exist`)
  process.exit(1)
}

if (input.columnName) {
  query = `PRAGMA table_info(${input.tableName})`
  const columns = db.query(query).all()
  const hasColumn = columns.some((col: any) => col.name === input.columnName)
  
  if (!hasColumn) {
    console.error(`Column ${input.columnName} does not exist in ${input.tableName}`)
    process.exit(1)
  }
}

// 成功
process.exit(0)
```

### 2. 在 Playbook 中使用

```yaml
steps:
  - name: "Verify database migration"
    action: "execute_migration"
    proofs:
      - name: check_migration
        input:
          tableName: "users"
          columnName: "email"
```

### 3. 测试自定义探针

```bash
# 直接测试
echo '{"tableName":"users","columnName":"email"}' | bun run .xenonix/proofs/check_migration.ts

# 检查退出码
echo $?
# 0 = 成功, 1 = 失败
```

## 探针开发最佳实践

### 1. 原子化原则

每个探针应该只做一件事：

```typescript
// ✅ 好：单一职责
if (fileExists(path)) {
  process.exit(0)
} else {
  process.exit(1)
}

// ❌ 坏：多重职责
if (fileExists(path) && fileIsValid(path) && fileHasContent(path)) {
  process.exit(0)
}
```

### 2. 绝对布尔输出

只返回 0 或 1，不要返回中间状态：

```typescript
// ✅ 好：绝对布尔
const result = await validate(input)
process.exit(result ? 0 : 1)

// ❌ 坏：模糊评分
const score = calculateScore(input)
if (score > 80) {
  process.exit(0)
} else if (score > 60) {
  process.exit(2) // 不要这样做
}
```

### 3. 错误信息清晰

提供有用的错误信息：

```typescript
// ✅ 好：清晰的错误信息
if (!result) {
  console.error(`Migration failed: Column ${columnName} missing in table ${tableName}`)
  process.exit(1)
}

// ❌ 坏：模糊的错误信息
if (!result) {
  process.exit(1)
}
```

### 4. 参数验证

验证输入参数：

```typescript
interface MyInput {
  required: string
  optional?: number
}

const input: MyInput = JSON.parse(inputJson)

// 验证必需参数
if (!input.required) {
  console.error('Missing required parameter: required')
  process.exit(1)
}

// 验证参数类型
if (input.optional && typeof input.optional !== 'number') {
  console.error('Invalid type for optional: expected number')
  process.exit(1)
}
```

### 5. 超时处理

对于长时间运行的操作，实现超时：

```typescript
const timeout = 30000 // 30 seconds
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), timeout)

try {
  await longRunningOperation(controller.signal)
  clearTimeout(timeoutId)
  process.exit(0)
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Operation timed out')
  }
  process.exit(1)
}
```

## 全局自定义探针

全局探针存储在 `~/.xenonix/custom-proofs/` 目录，可以在所有项目中复用。

### 示例：公司内部规范检查

```typescript
// ~/.xenonix/custom-proofs/check_company_api.ts

interface APIInput {
  endpoint: string
  requiredHeaders: string[]
}

const input: APIInput = JSON.parse(inputJson)

const response = await fetch(input.endpoint, {
  method: 'OPTIONS'
})

const headers = response.headers
const missingHeaders = input.requiredHeaders.filter(h => !headers.get(h))

if (missingHeaders.length > 0) {
  console.error(`Missing required headers: ${missingHeaders.join(', ')}`)
  process.exit(1)
}

process.exit(0)
```

在任意项目中使用：

```yaml
proofs:
  - name: check_company_api
    input:
      endpoint: "https://api.example.com/users"
      requiredHeaders: ["X-Company-Auth", "X-Request-ID"]
```

## 调试技巧

### 1. 查看可用探针

```bash
xn proof-list
```

### 2. 测试探针

```bash
# 测试内置探针
bun run src/cli.ts proof-list

# 测试自定义探针
echo '{"param":"value"}' | bun run .xenonix/proofs/my_proof.ts
```

### 3. 查看日志

Proof 执行日志存储在数据库中：

```bash
# 查询最近的 proof 执行记录
sqlite3 .xenonix/project.db "SELECT * FROM proof_logs ORDER BY timestamp DESC LIMIT 10"
```

## 禁止的模式

以下类型的探针是**严格禁止**的：

1. **LLM 评判** (`llm_judge`)
   - ❌ 使用大模型评估代码质量
   - ❌ 使用大模型判断功能正确性

2. **复杂业务逻辑** (`complex_business_logic_check`)
   - ❌ 检查支付代码的并发漏洞
   - ✅ 应拆解为具体的数据库状态检查或单元测试

3. **模糊评分** (`code_style_score`)
   - ❌ 代码优雅度评分（80 分以上通过）
   - ✅ 使用 linter 的零/非零退出码

## 总结

- 使用内置探针覆盖 99% 的工程场景
- 编写原子化的自定义探针扩展能力
- 遵循绝对布尔原则
- 保持探针简单、可测试
- 利用 `xn proof-list` 查看可用探针
