---
version: 0.6.2-alpha.2
date: 2026-08-01
type: alpha
status: planned
---

# 0.6.2-alpha.2 — RFC-0015 §D6 重写 + RFC-0016 拆分

> 本 changelog 仅为 RFC 文档变更，未触及运行时代码。RFC-0015/0016 均为 Draft，未执行。

## 核心改动

### RFC-0015 §D6 重写（Proof 体系重整）

**原 §D6**：设计 4 个通用 builtin probe（file-hash / test-coverage / json-path / port-listening）。

**改后 §D6**：4 个 OXN-internal 生命周期 probe，对应 commit 63b50dd 实际实现并标注 "RFC-0015 D6.1-D6.4" 的代码：

| Probe | scope | 验证对象 | D6 修复的设计瑕疵 |
|---|---|---|---|
| `boundary-guard` | @prj/ | work.md task refs | 硬编码 builtin domain 列表 → 动态 registry |
| `stale-draft-check`（原 `stale-pool-check`） | @prj/ | drafts references[] | 改名 + 扫 drafts/ 替代已废弃的 pools/（修死代码） |
| `asset-migrate-check` | @prj/ | .archived/assets 完整性 | 删除重复实现 + 死调用 |
| `oxn-runtime-version` | @prj/ | config.runtime.oxnVersion | import.meta.url 路径上溯 → context 注入 |

### RFC-0015 D4.2 扩展

- 原 D4.2：4 个旧 OXN-internal probe 移 @prj/
- 改后 D4.2：**8 个 OXN-internal probe**（4 旧 + 4 新 commit 63b50dd）统一为 @prj/
- 新增"教训"段：commit 63b50dd 让 4 个 OXN-internal probe 直接创建为 @oxn/ 是反向操作——未来 OXN-internal probe 应直接创建为 @prj/
- 收敛后 builtin 数量从 "19 → 13" 更新为 "19 → 9"

### RFC-0016 新建（通用验证 probe 扩展）

承接 RFC-0015 原 §D6 的 4 个通用 probe 设计，独立成 RFC 避免 RFC-0015 "重整" 主题被通用能力扩展拖累：

| 维度 | 内容 |
|---|---|
| 4 个 probe | file-hash / test-coverage / json-path / port-listening |
| scope | @oxn/（universal builtin） |
| 状态 | Draft（未执行） |
| 实施时机 | 独立于 RFC-0015，可并行推进 |

### RFC-0015 摘要与分期同步

- 摘要第 4 点：从"4 个高价值缺失 probe 补缺"改为"8 个 OXN-internal probe 统一 @prj/ + 通用 probe 拆至 RFC-0016"
- D7 Phase 4：从"D5+D6（可配置化+补缺）"改为"D4.2+D5+D6（OXN-internal 收敛 + 可配置化 + 生命周期 probe）"
- 影响范围 Phase 4 落地声明：更新为 D6.1-D6.4 4 个修复项
- 新增"不在本 RFC 范围" 1 条：通用 probe 扩展（指 RFC-0016）

## 影响范围

- **测试**：未触及运行时代码（RFC 文档变更）
- **文档**：`docs/rfc/zh-cn/RFC-0015-proof-system-overhaul.md` 大幅修订（摘要 + D4.2 + D6 + D7 + 影响范围 + Phase 4）+ 新增 `docs/rfc/zh-cn/RFC-0016-generic-verification-probes.md`（347 行）
- **构建**：`bun scripts/check-doc-boundary.ts` 必须 0 violations（RFC 内部互引 + RFC → glossary 路径有效）
- **未变更**：commit 63b50dd 的 1607 行代码（保持与 RFC-0015 D6 修订后的设计一致）

## 关联文档

- `.openxenon/drafts/2026-08-01-rfc-0015-d6-rewrite-session.md`（如未来落盘，本会话产出汇总）
- [RFC-0015 Proof 体系重整](./docs/rfc/zh-cn/RFC-0015-proof-system-overhaul.md) — §D6 修订后
- [RFC-0016 通用验证 probe 扩展](./docs/rfc/zh-cn/RFC-0016-generic-verification-probes.md) — 新建
- commit 63b50dd — RFC-0015 D6 4 个 OXN-internal probe 初始实现（设计瑕疵在 D6 修订中固化）
