# OXN CRUD Processor (oxn-crud-service)

## ADDED Requirements

### Requirement: OxnCrudProcessor 是纯计算引擎

OxnCrudProcessor SHALL 是纯计算引擎，接收结构化指令 + AST/CST，输出 `TextEdit[]`，绝不直接操作文件系统。

**接口定位**:
```typescript
export class OxnCrudProcessor {
  /**
   * 纯逻辑计算：根据指令计算需要对 .oxn 文件做出的文本修改
   * 不发生任何 IO！
   */
  calculateTextEdits(intent: AddProbeIntent, document: LangiumDocument): TextEdit[] {
    // 1. OxnScope 查找 CST 节点
    // 2. OxnSerializer 序列化配置
    // 3. 计算 insertPosition
    // 4. 返回 TextEdit[]
  }
}
```

### Requirement: CRUD 操作列表

OxnCrudProcessor SHALL 提供以下 CRUD 操作（按优先级）：

| 操作 | 说明 |
|------|------|
| `add_probe_to_part` | 给 Part 添加探针实例 |
| `add_part_to_blueprint` | 给 Blueprint 添加 Part 引用 |
| `add_blueprint` | 添加新的 Blueprint 声明 |

### Requirement: TextEdit 生成流程

OxnCrudProcessor SHALL 按以下流程生成 TextEdit：

1. **定位目标节点**：通过 OxnScope 根据名称查找目标 AST 节点
2. **序列化 DSL 文本**：OxnSerializer 将 AI 输入的 JSON 配置转换为 OXN 语法文本
3. **计算插入位置**：利用目标节点的 `$cstNode` 获取源码位置
4. **生成 TextEdit**：构造 LSP TextEdit 对象

```
输入: intent (JSON) + document (LangiumDocument)
  → OxnScope.findBlueprint("WebServer") → BlueprintASTNode
  → OxnScope.findPart("Nginx", blueprintNode) → PartNode
  → OxnSerializer.serializeProbe(probe_config) → DSL 文本
  → calculateInsertPosition(partNode.$cstNode) → Position
  → generateTextEdit() → TextEdit[]
```

### Requirement: Zod 运行时校验

OxnCrudProcessor SHALL 在执行前使用 Zod 对 AI 输入进行运行时校验。

校验流程：
1. 加载 `ai-tools/validators.ts` 中对应 tool 的 Zod schema
2. 用 Zod schema 校验输入参数
3. 校验失败时抛出清晰的错误信息
4. 校验通过后继续执行

校验失败示例：
```json
{
  "error": "Validation failed for add_probe_to_part",
  "details": [
    { "field": "probe_config.type", "message": "enum violation: expected HttpProbe | ShellProbe | FsProbe" },
    { "field": "part_name", "message": "required" }
  ]
}
```

### Requirement: TextEdit 缩进感知

OxnCrudProcessor SHALL 在计算 `TextEdit` 时，从父节点（如 `partNode.$cstNode`）的缩进上下文中动态推导缩进量。

- 绝不可硬编码缩进（如固定 2 空格或 4 空格）
- 必须从原文件上下文中读取实际的缩进格式

### Requirement: Apply-Validate 安全网

Runtime (CLI) SHALL 在调用 Infra 写回文件后，强制触发 Langium 重新解析进行语法校验。

**推荐 Infra 实现："影子写入 + 原子换名"模式**：
```
1. 读取原文件内容 (作为回滚备份)
2. 在内存中应用 TextEdit，生成 newContent
3. 写入 `.shadow` 临时影子文件 (绝不直接覆盖原文件)
4. 对影子文件触发 Langium 内存解析 (此时不写盘！)
5. 如果内存解析失败 → 删除影子文件，原文件毫发无损！无需回滚！
6. 如果内存解析成功 → rename(shadowPath, filePath) 原子换名
```

**优势**：无论何时崩溃，原文件要么是修改前状态，要么是修改后状态，绝不会出现半写或回滚失败的中间态。

如果解析失败：
1. 向 AI 返回明确的错误信息："TextEdit caused syntax error, operation aborted"
2. 绝不返回语法损坏的文件给 AI

OxnCrudProcessor SHALL 将 AI 传入的 JSON Object 参数转换为 OXN DSL 格式。

转换规则：
- `{ path: "/health", timeout: 3000 }` → `{ path = "/health", timeout = 3000 }`
- AI 传入 `:` 格式，输出 `=` 格式

**OxnSerializer 手写实现**：
- 位于 `src/oxn-dsl/crud/oxn-serializer.ts`
- 基于 Langium AstNode 构建，或手写字符串拼接
- MVP 阶段采用手写映射 + 穷举匹配

### Requirement: CLI 接口与 Infra 协作

外部调用方（CLI/Skill）SHALL 通过 CLI 命令调用 OxnCrudProcessor：

```bash
oxn add probe --to-part Nginx --data '{"type":"HttpProbe","path":"/health"}'
```

**Runtime 编排链路**：
```
AI 指令 → CLI (Runtime)
        → Infra: 读取 .oxn 文件，解析为 LangiumDocument
        → OxnCrudProcessor: 计算 TextEdit[]
        → Infra: 应用 TextEdit 到文件
```

CLI 负责：
- 参数校验
- 调用 Infra 读写文件
- 调用 OxnCrudProcessor

OxnCrudProcessor 负责：
- 纯逻辑计算
- TextEdit 生成
- 参数校验

Infra 负责：
- 文件 IO
- LangiumDocument 管理

## 技术约束

- OxnCrudProcessor 位于 `src/oxn-dsl/crud/oxn-crud-processor.ts`
- 使用 Langium CST 的 `$cstNode` 获取精确源码位置
- 不直接修改 AST，通过 TextEdit 间接修改
- 绝不调用 `fs.writeFile` 或任何 IO 操作
- Zod schema 来自 `ai-tools/validators.ts` 生成的定义