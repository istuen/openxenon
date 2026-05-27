## Context

当前系统已有多个内置 fs* Proof（fs_exists, fs_not_exists, fs_content_match, fs_parseable），用户需要手动配置 Stage 来使用这些 Proof。缺少开箱即用的默认 Stage 模板，导致每次创建工作流时都需要重复配置。

## Goals / Non-Goals

**Goals:**
- 基于现有 4 个 fs* 内置 Proof 创建对应的默认 Stage 配置
- 提供统一的默认 Stage 注册和查询机制
- 支持在 Blueprint 中引用这些默认 Stage

**Non-Goals:**
- 不实现自定义 Stage 模板功能（仅内置默认 Stage）
- 不修改现有 Proof 的执行逻辑
- 不支持用户动态创建 Stage 模板

## Decisions

1. **使用静态配置而非运行时注册**
   - 结论：在 `src/core/stage/default-stages.ts` 中导出静态 Stage 配置数组
   - 理由：内置 fs* Proof 数量有限且固定，静态配置更简单、性能更好

2. **默认 Stage 命名采用 `default:<proof-id>` 格式**
   - 结论：使用 `default:fs_exists`, `default:fs_not_exists` 等命名（下划线格式）
   - 理由：与 Proof ID 保持一致，明确标识为默认模板

3. **每个默认 Stage 包含完整配置**
   - 结论：Stage 配置包含 id、name、proof、description 和示例 input
   - 理由：用户可以直接复制使用，无需查看 Proof 源码

## Risks / Trade-offs

- [风险] 默认 Stage 覆盖场景有限 → 缓解：提供扩展机制，后续可增加更多默认 Stage
- [风险] Proof 参数格式变化导致默认 Stage 失效 → 缓解：在文档中说明依赖特定版本的 Proof