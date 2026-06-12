## 1. 修改 scanArsenalsDirectory 支持 scope 参数

- [x] 1.1 定义 `Scope` 类型 (`'project' | 'global' | 'fallback'`)
- [x] 1.2 修改 `scanArsenalsDirectory` 函数签名，增加 `scope` 参数
- [x] 1.3 实现 scope 分支逻辑：project/global/fallback

## 2. 更新 arsenal CLI 命令添加 --global 和 --{draft,canonical} 标志

- [x] 2.1 更新 `arsenal-inspect.ts` - 添加 `--global` / `-g`、`--draft`、`--canonical` 标志
- [x] 2.2 更新 `arsenal-list.ts` - 添加 `--global` / `-g`、`--draft`、`--canonical` 标志
- [x] 2.3 更新 `arsenal-promote.ts` - 添加 `--global` / `-g` 标志
- [x] 2.4 统一使用 `scope` 参数传递给 loader 函数

## 3. 实现 oxn-forge --global 支持

- [x] 3.1 修改 `createDraftFromYaml` 增加 `scope` 参数
- [x] 3.2 更新 `oxn-forge.ts` skill 解析 `--global` 标志
- [x] 3.3 根据 scope 调用不同路径创建资产

## 4. 验证测试

- [x] 4.1 测试 `oxn arsenal list` 默认 fallback 到全局
- [x] 4.2 测试 `oxn arsenal list --global` 只显示全局级
- [x] 4.3 测试 `oxn arsenal list --draft` 只显示 draft
- [x] 4.4 测试 `oxn arsenal list --canonical` 只显示 canonical
- [x] 4.5 测试 `oxn arsenal inspect <name>` 按名称查找
- [x] 4.6 测试 `oxn-forge --global` 创建全局资产