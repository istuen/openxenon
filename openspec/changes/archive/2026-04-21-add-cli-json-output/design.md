## Context

当前 OpenXenon CLI 使用 citty 框架，各命令直接使用 `console.log(JSON.stringify(...))` 输出 JSON。没有统一的 `--json` 参数，导致：
1. 脚本调用时无法自动获取 JSON 需要手动传递标志
2. 输出格式不统一 有的命令用 JSON有的用纯文本
3. 缺少 Schema 验证数据结构可能不一致

## Goals / Non-Goals

**Goals:**
- 在 CLI 入口添加全局 `--json` 参数
- 统一所有命令的 JSON 输出格式
- 使用 zod 验证输出 Schema

**Non-Goals:**
- 不修改 API 层的响应格式
- 不实现非 JSON 格式的替代输出（如 YAML）

## Decisions

1. **使用全局参数而非每个命令单独参数**
   - 结论：在 `src/cli.ts` 的 `args` 中添加 `--json`
   - 理由：全局参数更简洁，用户只需记一次

2. **输出逻辑使用 context 或 event 机制**
   - 结论：通过全局上下文或 event 传递 JSON 模式
   - 理由：避免修改所有命令的函数签名

3. **zod Schema 放在 src/types/schemas/**
   - 结论：创建 `src/types/schemas/` 存放 Schema
   - 理由：与现有类型定义分离，便于维护

## Risks / Trade-offs

- [风险] 修改所有命令输出逻辑工作量大 → 缓解：先实现核心命令，逐步扩展
- [风险] zod 体积影响 bundle size → 缓解：使用 citty 的 tree-shaking