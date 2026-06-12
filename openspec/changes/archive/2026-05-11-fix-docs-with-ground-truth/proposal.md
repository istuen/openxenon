## Why

Layer 1 测试（35/35 通过）已验证 Schema 的 Definition/Invocation 格式互斥。**测试是 ground truth，文档必须对齐。**

当前文档问题：
- README CLI 速查表列出了不存在的命令（`oxn task new`、`oxn standards`）
- 04-cli-ref.md 列出了大量从未实现的命令
- 05-arsenal.md 的 Probe 示例用了 Invocation 格式而非 Definition 格式
- 06-troubleshooting.md 使用了不存在的 `oxn standards` 命令

## What Changes

1. **README.md CLI 速查表修正**
   - 删除不存在的命令（`oxn task new`、`oxn task list`、`oxn task show` 等）
   - 只保留实际存在的命令

2. **04-cli-ref.md 完全重写**
   - 只写实际存在的命令（对照 src/cli/ 源码）
   - 删除所有"想象中的 API"

3. **05-arsenal.md Probe 示例修正**
   - 从 Invocation 格式改为 Definition 格式
   - 与 Layer 1 测试验证的 Schema 对齐

4. **06-troubleshooting.md 命令修正**
   - `oxn standards` → `oxn arsenal`

## Capabilities

### New Capabilities
- `docs-cli-commands`: CLI 命令文档（只写存在的命令）

### Modified Capabilities
- `docs-structure`: 文档结构重组（已有，需更新内容对齐 ground truth）

## Impact

- **涉及文件**:
  - README.md (CLI 速查表修正)
  - docs/manual/04-cli-ref.md (完全重写)
  - docs/manual/05-arsenal.md (Probe 示例格式修正)
  - docs/manual/06-troubleshooting.md (命令名修正)

- **锚点**:
  - tests/kernel/schemas/probe.test.ts (已验证 ProbeDefinitionSchema 行为)
  - src/cli/*.ts (实际命令源码)