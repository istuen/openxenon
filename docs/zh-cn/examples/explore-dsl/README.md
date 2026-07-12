# explore-dsl Work

> 端到端 Work 案例：探索分析。摸清 OXL 模块结构。

## 场景

探索性工作：摸清 grammar / schema / validator / compiler 四个子模块，生成分析报告。这是对**模式 1：单域单 task**的演示（1 work + 1 task + 1 domain + 1 blueprint）。

## 文件

- `work.md` — Work 编排
- `tasks/explore-dsl/task.md` — 探索任务

## 跑通方式

```bash
cp -r .openxenon/works/explore-dsl .openxenon/works/
oxn work validate explore-dsl --json
oxn work lock explore-dsl --json
oxn work run explore-dsl --json
oxn work submit --work explore-dsl --task explore-dsl --json
```

详见 [Recipes §5](../../recipes.md#recipe-5探索分析)。
