# /oxn-cli — 统一 OpenXenon CLI 操作入口

## 目标
当用户输入自然语言请求时，将请求转换为 `oxn` CLI 命令并执行。用户也可以直接输入 `/oxn-cli <子命令>` 跳过解析，直接转发到 CLI。

> **本 Skill 是 OpenXenon 的"翻译层"**。它知道所有 `oxn` 子命令的语义，能在自然语言和 CLI 之间做映射。**不重复其他 Skill 的领域知识**（如 work 状态机详解见 `/oxn-work`）。

## 前置条件
- `oxn` 命令已安装并可用（`oxn --version` 应能跑）
- 项目已经 `oxn init` 初始化（`ls .openxenon/` 应存在）
- 不在无法写盘的目录里（有些命令需要创建文件）

## OpenXenon CLI 实际子命令速查

> **CLI 是 v1.0.0-alpha 统一版**。下面的子命令列表是权威参考。**`oxn task *`、`oxn leader *`（除 run/submit/status 外）、`oxn forge *` 都不存在或已废弃**——不要调用。

| 子命令 | 用途 |
|--------|------|
| `oxn init` | 初始化项目边界（创建 `.openxenon/`、编译 Skills） |
| `oxn config show` | 读 `.oxnrc` + 解析优先级 |
| `oxn blueprint new <name>` | 在 `.openxenon/blueprints/` 生成 blueprint 骨架 |
| `oxn blueprint validate <name>` | 验证 blueprint 语法 |
| `oxn blueprint list` | 列出所有 blueprint |
| `oxn work new --work-id X --blueprint Y` | 创建 work 并启动状态机 |
| `oxn work list` | 列出所有 work |
| `oxn work summary --work-name X` | 从 state.json + work-trace.jsonl 总结 work |
| `oxn leader new --name X` | 从 blueprint 生成 work.oxn 骨架（仅含 mvp 风格 work） |
| `oxn leader run --work-file F` | 启动 work 状态机 |
| `oxn leader submit --work-name X [--run-probes]` | 推进状态机；带探针触发 reference 风格验证 |
| `oxn leader status --work-name X` | 读 work 当前状态 |
| `oxn install-skill [--target DIR]` | 重新安装 oxn-leader SKILL.md（用于 IDE 集成） |

## 核心翻译规则

| 用户说 | 你翻译为 |
|--------|----------|
| "初始化项目" / "set up OXN" | `oxn init --json` |
| "看看 .oxnrc 怎么配的" | `oxn config show --json` |
| "创建一个叫 deploy-pipeline 的 blueprint，3 个 stage" | `oxn blueprint new deploy-pipeline --slots build,test,deploy --json` |
| "验证 tiny 这个 blueprint 写得对不对" | `oxn blueprint validate tiny --json` |
| "列一下都有哪些 blueprint" | `oxn blueprint list --json` |
| "发起一个 my-work" | `oxn work new --work-id my-work --json`（如果用户没说蓝图，先 `oxn blueprint list` 看有什么） |
| "推进 my-work" / "下一步" / "完成当前 part" | `oxn leader submit --work-name my-work --json` |
| "跑探针验证 my-work" | `oxn leader submit --work-name my-work --run-probes --json` |
| "看 my-work 状态" | `oxn leader status --work-name my-work --json` |
| "总结 my-work 跑了什么" | `oxn work summary --work-name my-work --json` |
| "重新装 OpenCode Skill" | `oxn install-skill --force` |

## 执行步骤

### 步骤 1: 解析意图
- 解析用户自然语言，识别目标子命令
- 提取必填参数（如 `--work-id` 必须 kebab-case）
- **判断逻辑:**
  - 能确定 → 进入步骤 2
  - 无法确定 → 询问用户（"你想做什么：创建 work？查看状态？推进？其他？"）

### 步骤 2: 执行命令
- 用 `--json` 标志调用 CLI（**永远不要省略 `--json`**，否则无法解析响应）
- **判断逻辑:**
  - 命令返回 `ok: true` → 进入步骤 3
  - 命令返回 `ok: false` → 进入【熔断退出流程】
  - 命令报错/退出码非 0 → 重试 1/3，再失败进入【熔断退出流程】

### 步骤 3: 摘要响应
- 把 JSON 响应翻译成人类可读摘要
- 重点突出：操作结果、下一步建议、任何 warning
- **判断逻辑:**
  - 显示摘要，等待下一个用户指令

## 熔断退出流程
如果你在任何步骤被要求"熔断退出"或命令连续 3 次失败：
1. 立即停止执行任何 `oxn` 命令
2. 写入错误日志：`.openxenon/error/skills/<date>-oxn-cli-<step>.md`
3. 严格按以下格式输出报告：

## 🚨 OXN 执行异常报告
**当前执行的 Skill**: oxn-cli
**失败的步骤**: [步骤编号及描述]
**执行的命令**: `[实际执行的完整完整命令]`
**CLI 返回的错误 JSON**:
```json
[原样粘贴 CLI 的 --json 输出]
```
**AI 的初步分析**: [1-2 句话客观描述]
**建议工程师操作**: [具体建议]

4. 询问工程师："是否需要我尝试其他操作，还是您将手动介入？"

## 绝对禁止

- **不要调用已废弃的命令**：`oxn task *`、`oxn leader new | start | next | list`（除 `run/submit/status`）、`oxn forge *` 都不再存在
- **不要省略 `--json`**：否则无法解析响应
- **不要绕过 CLI**：必须用 `oxn` 命令，不要直接 `cd` 目录或手写文件
- **不要假设 `oxn leader` 命令**：它就是 `oxn leader`（`src/cli/leader.ts`），不是 `oxn learder` 等拼写错误
- **不要在 CWD 改变时硬编码路径**：用相对路径或 `.openxenon/...`
