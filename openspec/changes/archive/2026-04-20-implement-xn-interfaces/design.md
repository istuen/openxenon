## Context

当前 OpenXenon 需要实现四大命脉接口和核心类型接口，以支持运行时解耦。这些接口是 README 中已定义的 TypeScript 类型，需要转化为可执行的代码。

## Goals / Non-Goals

**Goals:**
- 实现四大命脉接口（XnStore、XnSandbox、XnRadar、XnTransport）
- 实现核心类型定义（XnTask、XnBlueprint、XnStage、XnSpec、XnProof、XnAction、XnSample）
- 定义适配器基类结构

**Non-Goals:**
- 不实现具体的适配器（Bun/Node）
- 不实现 Core 引擎逻辑

## Decisions

### 1. 接口目录结构

**决策：** 采用 `src/runtimes/interfaces/` 存放命脉接口，`src/types/` 存放核心类型

```
src/
├── runtimes/
│   └── interfaces/
│       ├── index.ts       # 统一导出
│       ├── store.interface.ts
│       ├── sandbox.interface.ts
│       ├── radar.interface.ts
│       └── transport.interface.ts
├── types/
│   ├── index.ts           # 统一导出
│   ├── xn-task.ts
│   ├── xn-blueprint.ts
│   ├── xn-stage.ts
│   ├── xn-spec.ts
│   ├── xn-proof.ts
│   ├── xn-action.ts
│   └── xn-sample.ts
```

### 2. 接口设计原则

**决策：** 每个接口独立文件定义，通过 index.ts 统一导出

**理由：** 符合 TypeScript 最佳实践，便于单独 import 和类型扩展

### 3. 类型层级

**决策：** 采用基类 + 接口 + 实现的三层结构

```
XenonixStore (interface)
    ↓
AbstractXenonixStore (abstract class)
    ↓
BunXenonixStore / NodeXenonixStore (implementation)
```

**理由：** 抽象基类可以提供公共逻辑，接口用于类型约束

## Risks / Trade-offs

- [风险] 接口变更频繁：接口可能随需求变化 → 保持接口最小化，只暴露必要方法
- [风险] 泛型设计复杂度：某些接口需要泛型支持 → 先实现具体类型，再逐步泛型化

## Open Questions

- 是否需要实现适配器工厂？
- 是否需要引入依赖注入容器？