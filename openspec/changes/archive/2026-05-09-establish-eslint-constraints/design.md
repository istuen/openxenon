## 方案对比

### 方案 A：添加到 .gitignore 异常

```gitignore
# .gitignore

# 保留 eslintrc.cjs
!.eslintrc.cjs
```

**优点**：改动小
**缺点**：可能与其他 `*.cjs` 忽略规则冲突

### 方案 B：迁移到 eslint.config.mjs

```javascript
// eslint.config.mjs (ESLint 9+)

export default [
  // 宪法约束
  {
    rules: {
      'no-console': 'error',
      'no-debugger': 'error',
      // ...
    }
  }
]
```

**优点**：ESLint 官方推荐格式
**缺点**：需要升级 ESLint，可能有 breaking changes

## 推荐

**方案 A** - 最小改动，先解决燃眉之急

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| .eslintrc.cjs 存在 | `ls -la .eslintrc.cjs` |
| 可以被 git add | `git add .eslintrc.cjs && git status` |
| 规则生效 | `pnpm lint` 无错误 |
