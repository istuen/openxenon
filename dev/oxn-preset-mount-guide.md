---
entity: dev-meta
type: oxn-preset-mount-guide
created: 2026-08-14
status: draft
related:
  - .openxenon/works/oxn-preset-mount-validate/
  - .openxenon/assets/blueprints/oxn-preset-mount.md
  - .openxenon/assets/domains/DSHPresetMount.md
  - docs/rfc/zh-cn/RFC-0031-oxn-dsh-preset.md
synced-at: 2026-08-14
---

# OXN DSH Agent Preset Mount 验证运行手册

> **范围**: 把 `~/.dsh/.agent-presets/oxn/` 从「文件已 fork」推进到「DSH session 内 roster 可见 + smoke test 通过」。
> **读者**: OpenXenon 工程师,D7 阶段执行者。
> **关系**: 本指南是 `oxn work oxn-preset-mount-validate` 的 verify stage 产物;前 3 个 stage 的 fixture 校验已被 `bun .openxenon/works/oxn-preset-mount-validate/check-mount-fixtures.ts` 覆盖(15/15 green)。

## 目录

- [§1 前置条件](#1-前置条件)
- [§2 Filesystem 改动](#2-filesystem-改动)
- [§3 Restart DSH Session](#3-restart-dsh-session)
- [§4 Inspect 验证](#4-inspect-验证)
- [§5 Smoke Test](#5-smoke-test)
- [§6 失败回滚](#6-失败回滚)
- [§7 OXN 行为边界](#7-oxn-行为边界)

## 1. 前置条件

| 项 | 期望 | 检查 |
|---|---|---|
| `~/.dsh/.agent-presets/oxn/` | 已 fork 2 文件:`agent.cordis.yml` + `preset.yml` | `ls -la ~/.dsh/.agent-presets/oxn/` |
| `~/.npm/_npx/.../cordis/` | shipped cordis preset 完整 | `ls ~/.npm/_npx/*/cordis/` (路径依 npx 缓存而定) |
| `oxn` CLI | v0.6.4+ | `oxn --version` |
| DSH 进程 | 当前 npx 进程有 `agentPresets.list()` 入口 | `which npx` 验证开发入口 |

## 2. Filesystem 改动

> **OXN 行为边界**: 2050 行后 OXN 不会自动写 `~/.dsh/` 或 `~/.config/dsh/`。本节是**工程师手动执行**的命令清单,全部需在 shell 里逐条跑。

### 2.1 D3 — preset.yml metadata 替换

```bash
$EDITOR ~/.dsh/.agent-presets/oxn/preset.yml
```

期望改动(基于 shipped `~/.npm/_npx/.../cordis/preset.yml` 对比):

```yaml
name: oxn              # ← 改为 oxn
description: OpenXenon agent preset (RFC-0031 mount)   # ← 替换
order: 4              # ← 放在 shipped 之后(system presets 0-3)
trust: user           # ← 标记为 user preset(可选)
```

**守门**: 保留 `tool-ralph.disabled: true` 行不动(如果它存在于此层级);新加 `tool-raph` 显式 disable(若 preset shell 允许)。

### 2.2 D4 — agent.cordis.yml persona 替换

```bash
$EDITOR ~/.dsh/.agent-presets/oxn/agent.cordis.yml
```

期望改动(保留 shipped 整体拓扑,只改 persona 块的 identity):

```yaml
persona:
  identity: OpenXenon Engineer   # ← 替换 Shipped Identity
  language: zh-CN
  ...
```

**守门**: `tool-ralph.disabled: true` **必须**保留;没有这一行视为 fork 失败,需手动加回去。

### 2.3 D5 — 创建 ~/.dsh/AGENTS.md

```bash
# 拷贝 shipped code preset 的 AGENTS.md 作起步
cp ~/.npm/_npx/*/code/AGENTS.md ~/.dsh/AGENTS.md
# 然后编辑,引用 RFC-0031:
$EDITOR ~/.dsh/AGENTS.md
```

**期望内容**: VitePress-style frontmatter + 5 段(裁决规则 / 加载链 / 唯一入口 / 行为规则 / 意图解析),与本仓库 `AGENTS.md` 保持结构一致但去掉仓库专属路径。

### 2.4 E1 — 创建 gating plugin(可选但推荐)

```bash
mkdir -p ~/.config/dsh/init.d
$EDITOR ~/.config/dsh/init.d/oxn-guard.js
```

完整源码见 `.openxenon/works/oxn-preset-mount-validate/patches/oxn-guard.js`(fix stage 产出)。6 命令白名单:`oxn / git / read / ls / grep / glob`。

### 2.5 验证文件都到位

```bash
for f in preset.yml agent.cordis.yml ~/.dsh/AGENTS.md ~/.config/dsh/init.d/oxn-guard.js; do
  [ -f "$f" ] && echo "✅ $f" || echo "❌ $f MISSING"
done
```

期望 4 个 ✅。

## 3. Restart DSH Session

DSH 进程的 preset roster 是**启动时物化**的,后增文件不热加载。必须重启。

```bash
# 1. 找到当前 npx 进程
ps aux | grep -E "npx.*dsh" | grep -v grep

# 2. 杀掉它
pkill -f "npx.*dsh"             # 或用上一步拿到的 PID

# 3. 等待 2 秒(让 port 释放)
sleep 2

# 4. 重新启动
npx @deepseek-ai/dsh web
```

**期望**: 启动 log 里出现「loaded 5 presets (standard + code + minimal + cordis + oxn)」。

## 4. Inspect 验证

在新 session 内,跑 DSH inspect queries:

```bash
# 4.1 list 全部 presets
agentPresets.list()
# 期望:
# [
#   { id: 'standard', trust: 'system', path: '~/.npm/_npx/.../standard/' },
#   { id: 'code',     trust: 'system', path: '~/.npm/_npx/.../code/' },
#   { id: 'minimal',  trust: 'system', path: '~/.npm/_npx/.../minimal/' },
#   { id: 'cordis',   trust: 'system', path: '~/.npm/_npx/.../cordis/' },
#   { id: 'oxn',      trust: 'user',   path: '~/.dsh/.agent-presets/oxn/' },  ← ← 新出现
# ]

# 4.2 拿 standing key
agentPresets.standingKeyFor('oxn')
# 期望: 非空对象(legal hash)
# 期望: {"presetId":"oxn","toolsOk":true,"commandsOk":true,"persona":"OpenXenon Engineer"}
```

**判据**: 4.1 数组含 `'oxn'` 元素 + 4.2 返回非空 standing key = mount 成功。

## 5. Smoke Test

跑 3 条最小 `oxn work` 命令验证 oxn preset 在新 session 内能 normal 驱动:

```bash
# 5.1 create
oxn work create smoke-oxn-mount --blueprint dev-workflow --goal "verify oxn preset"

# 5.2 validate
oxn work validate smoke-oxn-mount --json | head -10

# 5.3 lock
oxn work lock smoke-oxn-mount --json | head -10
```

**判据**: 5.1 状态 `created` + 5.2 `valid: true` + 5.3 `planLock.lockedAt` 非空 = preset 工作流接通。

## 6. 失败回滚

如果 §4 任何一步返回空或缺项,按以下 5 步排查:

1. **检查 preset 目录存在**: `ls -la ~/.dsh/.agent-presets/oxn/`
2. **检查 preset.yml 语法**: `python3 -c "import yaml; yaml.safe_load(open('~/.dsh/.agent-presets/oxn/preset.yml'))"`
3. **检查 agent.cordis.yml 语法**: `python3 -c "import yaml; yaml.safe_load(open('~/.dsh/.agent-presets/oxn/agent.cordis.yml'))"`
4. **确认 DSH 真的重启了**: `ps aux | grep "npx.*dsh"` 看 start time
5. **看 DSH 启动 log**: stderr 里有无 `failed to load preset oxn` 这种错

**最后手段**:把 `~/.dsh/.agent-presets/oxn/` 临时改名 → 启动 DSH → 确认 list() 不含 oxn → 改回来 → 再启动 → 验证两面行为差异。

## 7. OXN 行为边界

> **本指南不会自动写 `~/.dsh/`。** 工程师在 §2 步骤后必须人工读一遍 4 文件确认没把 shipped preset 覆盖掉。

OXN 的本职是「流程编排 + 资产校验」,「文件系统渗透」应是工程师的最终决策。`oxn work oxn-preset-mount-validate` 的 4 stage 仅负责:

- diagnose: 盘点差异
- locate: 定位 patch anchor
- fix: 产出本地 patches + apply.sh(由 fix task 负责)
- verify: 写本 guide(你的当前步骤)

`apply.sh` 工件位于 `.openxenon/works/oxn-preset-mount-validate/patches/apply.sh`(fix stage 产出),幂等执行 §2 全部 4 步。建议先 dry-run 再 apply:

```bash
bash -n patches/apply.sh                # 语法检查
bash patches/apply.sh --dry-run         # 模拟
bash patches/apply.sh                   # 真实执行
```

## 关联资源

- **Work 元数据**: `.openxenon/works/oxn-preset-mount-validate/work.md`
- **4 Task 详情**: `.openxenon/works/oxn-preset-mount-validate/tasks/{diagnose,locate,fix,verify}/task.md`
- **Blueprint v0.3.0**: `.openxenon/assets/blueprints/oxn-preset-mount.md`
- **Domain DSHPresetMount**: `.openxenon/assets/domains/DSHPresetMount.md`
- **Fixture check**: `bun .openxenon/works/oxn-preset-mount-validate/check-mount-fixtures.ts`

## 维护约定

本指南随 `oxn work oxn-preset-mount-validate` 同步更新。每次 `fix task` 阶段产出新 patch 时,verify task 应同步刷新本指南的 §2 命令清单。
