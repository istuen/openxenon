## Context

Blueprint 中的 `ref` 是浮动引用，如果 Arsenal 升级，同一 Blueprint 在不同时间执行可能产生不同结果。这违反了「案卷不可篡改」的核心公理。

## Goals / Non-Goals

**Goals:**
- submit 时执行深度内联展开
- 生成 `blueprint.frozen.yaml` 物理锁死所有引用
- `_xenon_meta` 元数据烙印血缘
- 血缘报告在 submit 时打印

**Non-Goals:**
- 不维护 Arsenal 的多版本共存
- 不支持运行时动态加载新引用

## Decisions

### 1. 冻结时机与位置

`oxn task submit` 时，在写入 `.openxenon/tasks/<task_id>/` 目录前执行冻结。

### 2. blueprint.frozen.yaml 结构

```yaml
id: deploy-laravel
frozen_at: "2024-05-20T10:00:00Z"
stages:
  - id: setup
    _xenon_meta:
      ref: "oxn/stages/create-git-branch"
      resolved_from: "kernel"
      shadow: false
      content_hash: "sha256:xxx"
    target: { description: "..." }
    spec: { description: "..." }
    action: { command: "git checkout -b feat/t-123" }  # 参数已注入
    probes:
      - _xenon_meta:
          ref: "oxn/exec-exit-zero"
        type: exec_exit_zero
        command: "git branch --show-current | grep -E '^feat/'"
```

### 3. 血缘报告格式

```text
[Core] Resolving blueprint assets...
  ✅ stage: setup-env
     -> resolved: <project>/.openxenon/arsenal/stages/create-git-branch (Shadowed Global)
     -> version frozen.
  ✅ stage: install-deps
     -> resolved: ~/.openxenon/arsenal/stages/install-dependencies (Global)
     -> version frozen.
```

### 4. 运行时只读 frozen

Task 执行时，Core 只读取 `blueprint.frozen.yaml`，不再访问 Arsenal。

## Risks / Trade-offs

[Risk] frozen 文件过大 → [Mitigation] 深度内联只拷贝必要字段，不拷贝空结构

[Risk] Task 目录被删除导致无法复现 → [Mitigation] frozen 文件是复现的唯一真理源，不依赖 Arsenal