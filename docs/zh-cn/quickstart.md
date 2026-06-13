---
title: 快速开始
---

# 快速开始

> 5 分钟跑通 Proof-First：装好 `oxn` → 创建 Proof → 添加 Probe → 运行验证 → 理解 frozen.json。
> 不要求先学 Domain 或 Blueprint。

## What —— Proof-First 是什么

Proof-First 是 IAP 范式中 **Proof 轴的独立运作模式**——工程师跳过 Intent/Align 资产化，直接使用 Probe 声明验收标准，让 OXN 验证 AI 的工作结果。

这是 OpenXenon 的第一次体验。目的是用最短时间让你**亲眼看到 OXN 如何证明结果**。

## Why —— 为什么这样设计

Proof-First 解决了 IAP 的冷启动问题：不需要先说服你学 Domain + Blueprint，只需要你用 Probe 抓住一次 AI 假完成，价值就成立。重复使用的痛点会自然驱动你升级到完整 IAP。

见 [Core Concepts](./core-concepts.md) 了解完整 IAP 范式设计原理。

## How —— 怎么用

### 第一步：环境要求与构建

- **Bun** >= 1.0.0

```bash
git clone https://github.com/anomalyco/openxenon.git && cd openxenon
bun install --frozen-lockfile && bun run build
```

### 第二步：初始化工作台

```bash
./dist/oxn init

# 快速开始
./dist/oxn init --ai opencode   # OpenCode
./dist/oxn init --ai cursor     # Cursor
./dist/oxn init --ai codex      # Codex
```

输出：
```
项目初始化成功: my-project (locale: zh-CN)
✓ Created .openxenon/
✓ Created .openxenon/config.json
```

### 第三步：创建你的第一个 Proof

```bash
# 快速开始
./dist/oxn proof create check-deploy
# 快速开始
```

### 第四步：添加 Probe（验收标准）

```bash
# 快速开始
./dist/oxn proof probe add fs-exists --target ./dist/index.js

# 快速开始
./dist/oxn proof probe add http-responds --url http://localhost:3000/health --status 200
```

### 第五步：运行证明

```bash
./dist/oxn proof run check-deploy
```

输出示例（通过时）：
```
Kernel: 校验 Probe 声明合法性... OK
Infra:  执行 2 个 Probe...
  ✅ fs-exists: ./dist/index.js found
  ✅ http-responds: 200 OK
Verdict: PASS (2/2)
Proof saved: .openxenon/proofs/check-deploy/frozen.json
```

输出示例（失败时）：
```
Kernel: 校验 Probe 声明合法性... OK
Infra:  执行 2 个 Probe...
  ✅ fs-exists: ./dist/index.js found
  ❌ http-responds: connection refused (expected 200)
Verdict: FAIL (1/2)
Proof saved: .openxenon/proofs/check-deploy/frozen.json
```

### 第六步：查看 frozen.json

```bash
cat .openxenon/proofs/check-deploy/frozen.json
```

```json
{
  "proofName": "check-deploy",
  "frozenAt": "2026-06-12T10:00:00Z",
  "verdict": "PASS",
  "probes": [
    { "name": "fs-exists", "status": "PASSED", "actual": "found" },
    { "name": "http-responds", "status": "PASSED", "actual": "200" }
  ]
}
```

### 第七步：AI 方式运行（可选）

在 Cursor / OpenCode / Codex 中输入：

```
/oxn-proof 验证 dist/index.js 是否存在并导出 handler
```

AI 通过 Skill 调用 CLI，结果回流到 frozen.json。

## frozen.json 的不可篡改性

frozen.json 是 OXN Engine 签发的检验报告。AI 和工程师都**只能读，不能改**。如果 AI 能绕过 Probe 直接修改 frozen.json 的 verdict，整个 Proof 轴就名存实亡。

## 更多 Proof 操作

```bash
# 快速开始
./dist/oxn proof list

# 快速开始
./dist/oxn proof show check-deploy
```

## → 下一步

Proof 跑通后，重复使用的 Probe 会自然驱动你升级到完整 IAP：

→ **[Intent](./intent.md)** — 用 Domain 和 Blueprint 把验收标准固化为可复用资产
