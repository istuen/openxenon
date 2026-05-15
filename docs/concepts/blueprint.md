# Blueprint（蓝图）

Blueprint 是任务的工程图，定义完整的执行拓扑（DAG）。

## 定义

Blueprint 不发明逻辑，只对 Arsenal 中的 Stage 进行实例化与编排。

## 结构

```yaml
name: 构建并测试
stages:
  - id: build
    ref: stages/build
    params:
      output: dist/
    deps: []
  
  - id: test
    ref: stages/test
    params:
      coverage: 80
    deps: [build]
```

## 字段说明

| 字段 | 类型 | 必需 | 含义 |
|------|------|------|------|
| `name` | string | 是 | 任务名称 |
| `stages` | array | 是 | Stage 实例列表 |
| `stages[].id` | string | 是 | 实例唯一标识 |
| `stages[].ref` | string | 是 | 引用 Arsenal 中的 Stage |
| `stages[].params` | object | 否 | 参数注入 |
| `stages[].deps` | array | 否 | 依赖的 Stage ID 列表 |

## DAG 编排

通过 `deps` 字段定义 Stage 之间的依赖关系：

```yaml
stages:
  - id: install
    deps: []
  
  - id: build
    deps: [install]
  
  - id: test
    deps: [build]
  
  - id: deploy
    deps: [test]
```

Core 会按拓扑顺序执行，确保依赖满足后才执行下游 Stage。

## 参数化

Blueprint 可通过 `params` 注入参数，实现复用：

```yaml
# template.yaml
name: 部署服务
stages:
  - id: deploy
    ref: stages/deploy
    params:
      env: ${env}
      region: ${region}
```

提交时注入参数：

```bash
oxn task submit --blueprint template.yaml --param env=prod --param region=us-west
```

## 资产化价值

- **意图沉淀**：工程师的完整任务结构可保存、复用
- **可参数化**：同一 Blueprint 支持不同参数组合
- **可模板化**：常见任务模式可抽象为模板
