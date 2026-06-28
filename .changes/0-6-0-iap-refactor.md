---
categories:
  - Changed
  - Added
---

# 0.6.0 — IAP 架构重构：E1-E4 四实体 + L0-L3 分层 + Skill 极简

> **v0.6.0 主题**：把 OXN 从"IAP 三轴叙事"重构为"E1-E4 四结构实体 + L0-L3 工程分层"，把 Skill 收敛为 1 个（`oxn-work`），把 CLI 拆分到 L2 Engine Service（DDD 模块化），新增 Round 多轮 IAP 循环。

## 核心变化

### 1. E1-E4 四结构实体（哲学层）
| 实体 | 含义 | 主导权 |
|---|---|---|
| E1 Asset | 静态硬约束边界 | 工程师 |
| E2 Work | 动态协作（IAP + Round） | 工程师 ↔ AI |
| E3 Engine | 独立验证主权基座 | OXN |
| E4 Insight | 涌现层（1+1>2） | AI 推理 |

### 2. L0-L3 工程分层（概念层）
```
L3 Tools (CLI+Skills+Daemon) → L2 Engine (Asset/Intent/Align/Proof/Insight) → L1 OXL+Infra → L0 Kernel
```

### 3. Work 3 大模式 + Round
- Asset / Develop / Proof 3 模式（Insight 升为 E4 独立层）
- Round 多轮 IAP 循环（v0.6 最小实现：`oxn work next-round`）

### 4. Skill 极简
删除 `oxn-cli` / `oxn-proof`，唯一保留 `oxn-work`

### 5. Service 层拆分（L2 Engine DDD 模块化）
`src/service/<Domain>/{index,create,list,...}.ts` 模式，纯函数式导出

### 6. Insight 重定位
从"Work Mode D"升为 E4 涌现层（钱学森系统论整体论），v0.6 哲学占位 + CLI 占位，涌现推理 v0.7+
