# ADR-0018: LSP readonly `@glo/` + Fork-to-Local + atomic-index + CLI proxy

> **来源**：`docs_tmp/oxn-lsp-1.md`, `oxn-lsp-2.md` (2026-05-21)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L3 CLI / LSP

## 决策

LSP 设计四点原则：

### 1. readonly `@glo/`

`~/.openxenon/arsenals/` 下的全局 builtin / 用户全局资产在 LSP 视角下是**只读**。用户修改需 "[Fork to Local]"（复制到 `@prj/` 变可编辑）。

### 2. CLI Proxy 模式

```
VS Code → `oxn lsp` → spawn 纯 Node `lsp-server.js`（不依赖 Bun）
```

LSP server 必须能在 Bun 之外独立启动（VS Code 兼容性）。

### 3. Atomic Index

资产索引（completion / hover / definition 数据）必须**原子替换**：写 tmp 文件 + rename。**禁止** in-place mutate + read lock。

### 4. 降级启动

LSP 启动时如遇解析失败，**不阻断**，只对该文件标记为 `unresolved`，其余功能正常。

## 后果

- ✅ `@glo/` 安全（用户不会意外改 builtin）
- ✅ LSP 不锁死编辑器
- ✅ 增量重索引无竞态

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-21-oxn-lsp-1.md`