# Architecture

Detailed design documentation for OpenXenon.

> v0.1 起，OpenXenon 引入 DDD 双层架构（Domain / Task / Work），
> 核心架构从"三层资产"扩展为"四层领域"。

## Contents

### 入门

- [Intro](./intro.md) - 系统介绍
- [Concepts](./concepts.md) - 核心概念（v0.1 更新）

### 架构核心

- **[DDD Dual-Layer (v0.1)](./ddd-dual-layer.md)** 🌟 新增 — Domain / Task / Work 三层详解
- [Lifecycle](./lifecycle.md) - 完整生命周期
- [Information Hiding](./information-hiding.md) - 信息隐藏设计
- [Kernel](./kernel.md) - Kernel 纯函数层

### 资产与领域

- [Arsenal](./arsenal.md) - Arsenal 资产机制
- [Blueprint](./blueprint.md) - Blueprint 设计
- [Stage](./stage.md) - Stage 节点设计
- [Part](./part.md) - Part 资产设计
- [Probe](./probe.md) - Probe 原子检查
- [Artifact](./artifact.md) - Artifact 产物
- [Terminology](./terminology.md) - 术语表

### 特性与参考

- [Features](./features.md) - 功能总览
- [OXN DSL 设计实现指南](./oxn-dsl-design-and-implementation-guide.md) - DSL 演进史
