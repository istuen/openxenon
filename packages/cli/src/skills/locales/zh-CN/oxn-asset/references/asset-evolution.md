# Asset 演进（修改）

> 本文件是 `oxn-asset` Skill 的按需加载补充。修改现有 Asset 时查阅。

## 演进流程

### 步骤 1：定位 Asset

```bash
oxn asset list --type domain --name MemberContext
# 或
ls .openxenon/domains/MemberContext.oxn
```

### 步骤 2：检查 planLock

```bash
oxn asset show MemberContext --json
# 看 lock 状态、citations、依赖 Asset 列表
```

如果 Asset **被某个 Work lock 引用**：
- 触发 `IAP_ALIGN_LOCK_HASH_MISMATCH`（如果绕过 lock 直接改）
- **必须**先 `oxn work unlock <w>` → 改 Asset → `oxn work lock <w>`

### 步骤 3：触发 Asset 模式 Work（修改）

```bash
oxn work create evolve-MemberContext \
  --type asset --asset-kind domain \
  --evolve-from MemberContext \
  --json
```

Work 内部 IAP：
- **Intent**: 修改 MemberContext.oxn（明确改什么）
- **Align**: AI 读取旧版 → 写新版（带 diff）
- **Proof**: `oxn domain validate MemberContext` 通过

### 步骤 4：planLock 重新计算

Asset 修改后：
- 所有引用此 Asset 的 Work 的 `planLock` 自动失效
- 必须 `oxn work lock <w>` 重新锁
- `assets.json` slim 索引自动重算

### 步骤 5：citations 自动 +1

任何 Asset 修改后，**反向引用**（依赖此 Asset 的其他 Asset）的 `citations` 自动 +1。

## 演进 vs 新建

| 场景 | 建议 |
|---|---|
| 改 1-2 个 term | 演进（同 Asset） |
| 改 H2 分类结构 | 演进 + 强 planLock 验证 |
| 完全不同业务边界 | 新建（旧 Asset 归档） |

## 反模式

- ❌ 直接 `write_file` 修改 .oxn（v0.6.3+ hard-block，绕过 Work 路径）
- ❌ 改 .oxn 不解锁相关 Work（触发 `LOCK_HASH_MISMATCH`）
- ❌ 删 .oxn 不走归档流程（丢失审计 trail）