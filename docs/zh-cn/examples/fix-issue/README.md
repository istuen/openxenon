# fix-issue Work

> 端到端 Work 案例：故障修复。诊断 → 定位 → 修复 → 验证 4 阶段。

## 场景

修复一个 bug，按"diagnose → locate → fix → verify"流程串行 4 个 task。这是对**模式 3：多 task 串行**的演示。

## 文件

- `work.md` — Work 编排
- `tasks/diagnose/task.md` — 诊断任务
- `tasks/locate/task.md` — 定位任务
- `tasks/fix/task.md` — 修复任务
- `tasks/verify/task.md` — 验证任务

## 跑通方式

```bash
cp -r .openxenon/works/fix-issue .openxenon/works/
oxn work validate fix-issue --json
oxn work lock fix-issue --json
oxn work run fix-issue --json

# 4 个 task 串行推进
for t in diagnose locate fix verify; do
  oxn work submit --work fix-issue --task $t --json
done
```

详见 [Recipes §4](../../recipes.md#recipe-4故障修复)。
