## 1. 分析 .gitignore

- [x] 1.1 读取 `.gitignore`
- [x] 1.2 找出哪些规则忽略了 .cjs 文件

## 2. 修改 .gitignore（方案 A）

- [x] 2.1 添加 `!.eslintrc.cjs` 到 .gitignore
- [x] 2.2 确认没有其他规则会覆盖此异常

## 3. 验证 .eslintrc.cjs 可被跟踪

- [x] 3.1 `git add .eslintrc.cjs` - 验证成功
- [x] 3.2 `git status` 确认文件可以被 staged
- [x] 3.3 `git reset .eslintrc.cjs` 恢复到 unstaged（仅测试）

## 4. 验证 lint 正常工作

- [ ] 4.1 `pnpm lint` - ESLint 未安装，无法验证
- [x] 4.2 `.eslintrc.cjs` 存在且可被 git 跟踪
