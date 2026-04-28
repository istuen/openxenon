## Context

OpenXenon 的"综合集成研讨厅"模式需要一套完整的资产生成机制：
- **定性经验**：工程师提供自然语言描述
- **降维拆解**：AI 模型将自然语言转为 YAML 格式
- **物理确权**：Core 引擎校验 + 工程师确认

当前缺少的是"降维拆解"这一环，即 AI 如何接收工程师的自然语言并生成有效的标准资产 YAML。

## Goals / Non-Goals

**Goals:**
- 实现 `/oxn-forge` Skill，接收自然语言输入
- AI 生成符合 Zod Schema 的 Probe/Proof/Stage YAML
- Draft 资产只做结构校验，不执行任何逻辑
- 强制人类确权流程，防止 AI 自定规则

**Non-Goals:**
- 不实现 AI 直接执行 Probe 的能力
- 不实现自动 promote（必须人类手动确权）
- 不实现 LLM 本地部署（依赖外部 API）

## Decisions

### Decision 1: /oxn-forge 的交互流程

**决定**: 四段式交互流程

1. **工程师输入**：`/oxn-forge "帮我写一个检查 Laravel 安装成功的 Probe 体系"`
2. **AI 降维生成**：AI 调用 Core API `POST /api/v1/standards/draft` 提交 YAML
3. **Core 熔断**：Zod Schema 校验通过后物理落盘到 DRAFT 目录
4. **强制阻断**：AI 输出 "已生成 Draft 资产，等待审查"

**理由**:
- 物理落盘而非内存传递，保证资产不丢失
- Zod 校验防止 AI 生成结构错误的 YAML
- 强制阻断保证人类主权

### Decision 2: Probe 原子化设计

**决定**: 每个 Probe 只做单一检查，可组合使用

```yaml
# Probe 示例
type: fs_exists
params:
  path: composer.json
---
type: file_contains
params:
  file: composer.json
  pattern: '"laravel/framework"'
```

**理由**:
- 原子化保证复用性
- 组合灵活性高
- 符合"乐高积木"哲学

### Decision 3: 禁止在 Draft 阶段执行

**决定**: Core 对 Draft 资产实行"只读解析，绝对禁运"

- 只用 Zod 校验 YAML 结构
- 绝对禁止 Bun.spawn 执行任何 Draft 探针
- 只有 promote 到 CANONICAL 后才能在实际 Task 中执行

**理由**:
- 防止 AI 生成恶意探针（如 `rm -rf /`）
- 保证 Draft 阶段绝对安全

### Decision 4: 资产生成层级

**决定**: 按资产类型分层生成

```
Probe（原子检查）→ Proof（验证闭环）→ Stage（工序节点）→ Blueprint（拓扑蓝图）
```

**理由**:
- 符合 OpenXenon 的四层资产体系
- 便于工程师选择需要生成的粒度

## Risks / Trade-offs

[风险] AI 生成的 YAML 结构正确但逻辑错误
→ **缓解**: 由 Zod 保证结构正确，逻辑由工程师在 promote 前审查

[风险] 工程师不审查 Draft 就 promote
→ **缓解**: 在 CLI 输出中强制提示 "请先审查资产内容"

## Open Questions

1. 是否需要 `[oxn-request-context]` 指令让 AI 在 Sample 阶段主动获取 Context？
2. 是否需要版本历史记录追溯每个资产被 promote 的时间？