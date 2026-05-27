## Context

当前 `dev` 分支包含：
- MVP 0.1 核心功能：Blueprint YAML 存储、Staging 缓冲、双轨验证、逃逸检测
- 未来功能代码：Sample 偏差流、Draft 演化流、提案流程、部分实现的 DAG 编排、Git 分支沙箱、builtin proofs 扩展

MVP 0.1 的目标是验证核心机制可工作，不需要完整实现所有高级功能。

## Goals / Non-Goals

**Goals:**
- 保留 `archive/post-mvp-features` 分支，记录当前完整代码状态
- 精简 `dev` 分支，只保留 MVP 0.1 必需代码
- 明确识别哪些代码属于"未来功能"

**Non-Goals:**
- 不在 MVP 阶段实现任何新功能
- 不删除任何历史提交（通过分支存档保留）
- 不破坏 MVP 0.1 的测试覆盖

## Decisions

### Decision 1: 使用分支存档而非文件级注释

**选择**：创建 `archive/post-mvp-features` 分支

**理由**：
- Git 分支是代码历史的完整快照，包含所有提交记录
- 未来可以用 `git checkout` 或 `cherry-pick` 精确恢复特定文件或提交
- 比文件级注释更干净，不污染代码阅读体验

### Decision 2: 未来功能识别标准

以下代码应识别为"未来功能"（MVP 0.1 不需要）：

| 类别 | 具体内容 | 原因 |
|------|----------|------|
| Sample 机制 | `src/core/stage/sample-handler.ts` | 偏差流沙箱，0.5 才需要 |
| Draft 提案 | `src/commands/draft.ts`、提案流程相关 API | 演化流 UI，0.5 才需要 |
| DAG 编排 | `src/core/stage/` 中的 DAG 相关逻辑 | MVP 是线性执行 |
| Git 分支沙箱 | `src/core/sandbox/git-sandbox.ts`（如果存在） | staging 缓冲已足够 |
| 复杂逃逸检测 | 超过简单超时的逃逸判定逻辑 | MVP 用 DB 超时即可 |

### Decision 3: 保留但可简化的代码

| 类别 | 处理方式 |
|------|----------|
| builtin proofs 扩展 | 保留 MVP 4 个核心探针，删除额外的 |
| API handlers | 只保留 task-submit、step-verify、task-next |
| CLI 命令 | 只保留 init、daemon、api、trace |

## Risks / Trade-offs

- **[风险]** 删除了当前正在使用的代码导致测试失败
  - **缓解**：先运行完整测试，识别需要保留的最小集合
- **[风险]** 未来功能分支与 dev 分支产生大量冲突
  - **缓解**：只做分支存档，不做代码合并
- **[权衡]** 存档分支可能包含过时架构，不适合直接恢复
  - **说明**：恢复时需要人工评估哪些代码仍然适用

## Migration Plan

1. **确保所有工作已提交**
   ```bash
   git status  # 确认没有未提交变更
   ```

2. **创建存档分支**
   ```bash
   git branch archive/post-mvp-features dev
   ```

3. **分析代码确定保留范围**
   - 检查 builtin proofs 目录
   - 检查 API handlers 目录
   - 检查 CLI commands 目录
   - 检查 core stage 相关代码

4. **精简 dev 分支**
   - 删除未来功能代码
   - 运行测试确认 MVP 功能正常

5. **打 tag 并提交**
   ```bash
   git tag v0.1.0-alpha
   git commit -m "chore: 精简代码聚焦 MVP 0.1"
   ```

## Open Questions

1. **Q**: builtin proofs 中哪些是 MVP 必需的？
   **A**: `fs_exists`、`fs_content_match`、`exec_exit_zero` 是 MVP 验证核心。其他可删。

2. **Q**: 如果测试依赖未来功能代码怎么办？
   **A**: 简化测试，或将测试标记为 `@ignore` 暂时跳过

3. **Q**: README-v2.md 是否需要更新？
   **A**: 是的，它描述的是目标架构，可能需要说明"当前实现为 MVP 0.1"
