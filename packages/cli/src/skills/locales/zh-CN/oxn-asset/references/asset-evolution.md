# Asset 演进（修改 · v1.3 · RFC-0033 适配）

> 本文件是 `oxn-asset` Skill 的按需加载补充。修改现有 Asset 时查阅。

## 演进流程（RFC-0033 D2 已删 planLock 步）

### 步骤 1：定位 Asset

```bash
oxn asset list --type domain --name MemberContext
# 或
ls .openxenon/domains/MemberContext.md
```

### 步骤 2：检查引用 Work（RFC-0033 D2：planLock 已退役）

```bash
oxn asset show MemberContext --json
# 看引用 Work 列表 + citations + 依赖 Asset 列表
```

🗑️ **不再检查 planLock**：Asset 可自由修改；引用 Work 仍正常运转（work.md 可自由改）。

### 步骤 3：触发 Asset 模式 Work（修改）

```bash
oxn work create evolve-MemberContext \
  --type asset --asset-kind domain \
  --evolve-from MemberContext \
  --json
```

Work 内部流程（RFC-0033 D1：3 步）：
- **Intent**: 修改 MemberContext.md（明确改什么）
- **Align**: AI 读取旧版 → 写新版（带 diff）
- **验证**: `oxn domain validate MemberContext` 通过

### 步骤 4：引用 Work 自动适配（RFC-0033 D2 无需重锁）

Asset 修改后：
- 所有引用此 Asset 的 Work **无需重锁**（planLock 已删）
- 下次 submit 时如有 work.md hash 变化 → trace.jsonl append ASSET_DRIFT 事件（不阻断）
- `assets.json` slim 索引自动重算（run --validate-only 时）

### 步骤 5：citations 自动 +1

任何 Asset 修改后，**反向引用**（依赖此 Asset 的其他 Asset）的 `citations` 自动 +1。

## 演进 vs 新建

| 场景 | 建议 |
|---|---|
| 改 1-2 个 term | 演进（同 Asset） |
| 改 H2 分类结构 | 演进 + 触发引用 Work 重 validate |
| 完全不同业务边界 | 新建（旧 Asset 归档） |

## 反模式

- ❌ 直接 `write_file` 修改 .md（v0.6.3+ hard-block，绕过 Work 路径）
- ❌ 删 .md 不走归档流程（丢失审计 trail）
- ❌ 期望 OXN 阻断 Asset 修改导致 Work 报错（RFC-0033 D4：DRIFT 仅记录不阻断）