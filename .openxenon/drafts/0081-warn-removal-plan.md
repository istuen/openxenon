# ADR-0081 修订计划：移除 WARN severity

> **状态**：✅ 已执行（ADR-0081 已更新，含 WARN 移除 + 4 个 gap 决策落地）
> **日期**：2026-07-25
> **来源**：Grilling #14 — WARN throw 语义与控制流
> **目标文件**：`.openxenon/drafts/rfc/0081-oxn-unified-error-framework.md`

## 触发问题

ADR-0081 原设计有 3 档 severity（FATAL / ERR / WARN），WARN 通过 `.warn()` 工厂方法构造，D5 catch 块 `case 'WARN': break`（不 exit）。

**矛盾**：throw = 中断控制流。`.warn()` 构造的错误被 throw 后，throw 点之后的代码不执行——和 ERR 一样中断。D5 的"不 exit，继续执行"只是进程没死，命令逻辑实际被中断。"exit 0 (不阻断)"是语义误导。

**代码库既有决策**（`packages/engine/src/oxl/compiler/ref-diagnostic.ts:6-15`）已明确：
- IAPError = 硬阻断 + AI 必须 yield
- diagnostics = 软警告 + AI 可继续
- 两者用不同 code 前缀区分

ADR-0081 在 Error 类上加 `.warn()` 会**逆转这个既有决策**。

## 设计决策（Grilling #14 确认）

1. **Error = throw only**：EngineError / CLIError 只保留 ERR + FATAL 两档。无论问题类型（输入/数据/逻辑），只要需阻断就是 ERR。
2. **非阻断走 Diagnostic return 模式**：程序继续运行/完成，warning 信息作为数据附带在结果中，供事后追溯。
3. **severity 不混合阻断性**：strict 模式 → `throw DomainError.err()`（阻断）；lenient 模式 → `return { ok, diagnostics: [...] }`（不阻断）。是否阻断由业务逻辑决定，不由 severity 档位决定。
4. **Diagnostic 统一留到 ADR-0082**：当前 7 种 warning pattern 的碎片化不在 0081 范围内。
5. **Logger 是独立未来课题**：是否引入第三方 logging 库、激活死掉的 verbosity flag，不在错误体系 ADR 范围内。

## 当前 warning 碎片化现状（ADR-0082 待解决）

| Pattern | Shape | Severity 词汇 | 位置 |
|---|---|---|---|
| A | `warnings: string[]` 在结果中 | （无） | work-validator, work-migrator, Roadmap/parser (28+ 文件) |
| B | `diagnostics[]` + Zod schema, 持久化到 state.json | `'warn' \| 'error'` | dual-state, ref-diagnostic |
| C | `CanonicalIssue` | `'error' \| 'warning'` | remark-canonical, compilers |
| D | `ReferenceSeverity` | `'fatal' \| 'warn'` | reference-checker |
| E | `process.stderr.write('warning: ...')` | （无） | proof.ts, blueprint.ts — **--json 下的 bug** |
| F | `console.warn(...)` | （无） | compile-cache, entity-registry |
| G | `console.error('Warning: ...')` | （无） | domain.ts |

3 种不兼容的 severity enum。Pattern E 绕过 JSON envelope，`--json` 模式下 warning 丢失。

## 修订清单（逐条）

### 1. 标题（line 14）

`severity 三档` → `severity 两档`

### 2. Context §设计约束表（lines 36-46）

**删除** line 40：
```
| WARN 用于系统运行警告 | 用户决策（Q2） | CLI/Engine/Daemon 层警告，不是 Probe 验证结果 |
```

### 3. D1 EngineError 基类定义（lines 130-197）

- Line 136：`type Severity = 'FATAL' | 'ERR' | 'WARN'` → `type Severity = 'FATAL' | 'ERR'`
- Lines 182-187：**删除** `static warn()` 方法
- Line 163 注释：`3 个 severity 工厂方法` → `2 个 severity 工厂方法`
- Line 121：`3 个 severity 工厂方法` → `2 个 severity 工厂方法`
- Line 128：`err.severity` 一定是 FATAL/ERR/WARN → FATAL/ERR

### 4. D1 CLIError 基类定义（lines 201-258）

- Lines 245-249：**删除** `static warn()` 方法
- Line 260 注释：`3 个工厂方法` → `2 个工厂方法`

### 5. D1 使用示例（lines 379-401）

- Line 396：**删除** `throw ProofError.warn('DEPRECATED_SYNTAX', 'msg')`
- Line 400：**删除** `throw CLIError.warn('DEPRECATED_FLAG', 'msg')`
- Line 388：**删除** `ProofError.warning(...)` 错误示例
- 保留 `.err()` 和 `.fatal()` 的正确/错误示例

### 6. D3 Severity（lines 420-431）

- Line 424：**删除** WARN 行
- Line 428：**删除** "severity 由业务决定"段落（strict=WARN/lenient=ERR 例子不再适用）
- Line 430：**删除** "WARN 的边界"段落
- **新增** D3 段落：说明非阻断问题不在 Error 类上表达。代码库已有 Error（throw，阻断）vs Diagnostic（return，不阻断）的分离决策（`ref-diagnostic.ts:6-15`）。当前 7 种 warning pattern 的统一留到 ADR-0082。strict/lenient 模式差异：strict → `throw DomainError.err()`，lenient → `return { ok, diagnostics: [...] }`，是否阻断由业务逻辑决定。

### 7. D4 命名格式示例表（lines 446-455）

- Line 455：`E_MD_REFERENCE_BROKEN_WARN` 行 → **删除**或标注"迁移到 Diagnostic，不是 Error"

### 8. D5 CLI 路由（lines 459-516）

- Lines 490-503：**删除** `case 'WARN':` 分支
- catch 块变为 2-case：FATAL + ERR + Fallback

### 9. D6 类型守卫（lines 518-548）

- Line 528：`FATAL/ERR/WARN 之一` → `FATAL/ERR 之一`
- Line 546：`3 个工厂方法` → `2 个工厂方法`

### 10. Consequences 正面（lines 604-614）

- Line 608：`3 个工厂方法` → `2 个工厂方法`
- Line 610：**删除** #5（severity 业务可变）
- Line 613：**删除** #8（WARN 档位）
- Line 614：#9 重编号为 #7
- **新增**：Error = throw（阻断）/ Diagnostic = return（不阻断）的清晰分离，与代码库既有决策（`ref-diagnostic.ts:6-15`）一致。非阻断问题不在 Error 类上表达。

### 11. Consequences 负面（lines 616-622）

- Line 621：**改写** #4 — 例子从 `InfraError.warn('INTERNAL_ERROR', ...)` 改为 `InfraError.fatal('PATH_CONFLICT', ...)`（编译通过但语义可能不当）

### 12. Alternatives（lines 629-657）

- Alt-6（line 651）：更新引用"CLIError 只提供 .err()" → 仍有效但更新为 2 方法语境
- **新增 Alt-8**：WARN severity on Error class
  - 否决理由：throw 中断控制流与非阻断语义矛盾；代码库已明确 Error（throw，阻断）vs Diagnostic（return，不阻断）的分离（`ref-diagnostic.ts:6-15`）；非阻断 warning 应走 Diagnostic return 模式，不应用 Error 类的 severity 表达

### 13. References（lines 659-667）

- **新增**：`packages/engine/src/oxl/compiler/ref-diagnostic.ts:6-15` — Error vs Diagnostic 分离的既有决策
- **新增**：note about future ADR-0082 for Diagnostic unification (7 fragmented warning patterns)

## 不在本次范围

| 课题 | 归属 |
|---|---|
| 7 种 warning pattern 统一 | ADR-0082 |
| 3 种不兼容 severity enum 收敛 | ADR-0082 |
| Pattern E 的 `--json` bug 修复 | ADR-0082 |
| 死掉的 verbosity flag 是否激活 | 独立课题 |
| 是否引入第三方 logging 库 | 独立课题 |

## 执行检查清单

- [ ] 修订计划落盘（本文档）
- [ ] 执行 ADR-0081 编辑（13 项修订）
- [ ] 更新 ADR-0080 关系说明（如有引用 WARN）
- [ ] 更新 INDEX.md 标题（"severity 三档" → "severity 两档"）
- [ ] 更新 error-code-registry.md（如有 WARN 引用）
- [ ] 全文搜索 `WARN` / `.warn()` 残留引用
