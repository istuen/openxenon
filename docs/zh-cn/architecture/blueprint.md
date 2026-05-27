# Blueprint（蓝图）

Blueprint 是 OpenXenon 的"工程图"，定义完整的执行拓扑（DAG）。

## 定义

Blueprint 不发明逻辑，只对 Arsenal 中的 Part 进行实例化与编排。

## 结构

```yaml
name: 构建并测试
type: task
parts:
  - id: build
    ref: parts/build
    params:
      output: dist/
    deps: []

  - id: test
    ref: parts/test
    params:
      coverage: 80
    deps: [build]
```

## 字段说明

| 字段 | 类型 | 必需 | 含义 |
|------|------|------|------|
| `name` | string | 是 | Blueprint 名称 |
| `type` | string | 是 | Blueprint 类型：task / plan / explore |
| `parts` | array | 是 | Part 实例列表 |
| `parts[].id` | string | 是 | 实例唯一标识 |
| `parts[].ref` | string | 是 | 引用 Arsenal 中的 Part |
| `parts[].params` | object | 否 | 参数注入 |
| `parts[].deps` | array | 否 | 依赖的 Part ID 列表 |

## Blueprint.type 与 Work.type 强绑定

Work 的 type 与 Blueprint 的 type 必须匹配：

| Blueprint.type | Work.type | 说明 |
|----------------|-----------|------|
| `task` | `task` | 任务执行 |
| `plan` | `plan` | 计划编排 |
| `explore` | `explore` | 探索执行 |

```
Task 类型的 Work → 只能实例化 type: task 的 Blueprint
Plan 类型的 Work → 只能实例化 type: plan 的 Blueprint
```

## DAG 编排

通过 `deps` 字段定义 Part 之间的依赖关系：

```yaml
parts:
  - id: install
    deps: []

  - id: build
    deps: [install]

  - id: test
    deps: [build]

  - id: deploy
    deps: [test]
```

Core 会按拓扑顺序执行，确保依赖满足后才执行下游 Part。

## 参数化

Blueprint 可通过 `params` 注入参数，实现复用：

```yaml
# template.yaml
name: 部署服务
type: task
parts:
  - id: deploy
    ref: parts/deploy
    params:
      env: ${env}
      region: ${region}
```

创建 Work 时注入参数：

```bash
oxn work new my-work --type task --blueprint template.yaml --param env=prod --param region=us-west
```

## 资产化价值

- **意图沉淀**：工程师的完整任务结构可保存、复用
- **可参数化**：同一 Blueprint 支持不同参数组合
- **可模板化**：常见任务模式可抽象为模板
- **类型绑定**：与 Work.type 强绑定，确保执行语义一致