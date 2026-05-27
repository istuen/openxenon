## 方案

### 添加远程仓库

```bash
git remote add yuheng-forgejo ssh://git@forgejo.yuheng.chat/issac/openxenon.git
```

### 验证连接

```bash
git ls-remote yuheng-forgejo
```

### 推送分支

```bash
git push yuheng-forgejo dev
```

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| 远程仓库添加成功 | `git remote -v` 显示 yuheng-forgejo |
| SSH 连接正常 | `git ls-remote yuheng-forgejo` 无错误 |
| 推送成功 | `git push yuheng-forgejo dev` 完成 |