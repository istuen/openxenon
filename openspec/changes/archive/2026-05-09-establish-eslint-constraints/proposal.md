## Why

`.eslintrc.cjs` 是宪法级别的 lint 规则，但当前未被 git 跟踪（被 .gitignore 忽略）。这导致：
1. 新工程师可能不知道此文件存在
2. ESLint 约束无法通过 git 传播

**问题根源**：
`.gitignore` 中可能有 `*.cjs` 或类似规则

## What Changes

1. 修改 `.gitignore` 添加 `!.eslintrc.cjs` 异常
2. 或迁移到 `eslint.config.mjs`（ESLint 9+ 官方推荐）
3. 验证 `git add .eslintrc.cjs` 可以成功

## Impact

- ESLint 宪法约束可以通过 git 传播
- 所有工程师受到同等 lint 规则约束

## High Risk

- 修改 .gitignore 可能影响其他 .cjs 文件
