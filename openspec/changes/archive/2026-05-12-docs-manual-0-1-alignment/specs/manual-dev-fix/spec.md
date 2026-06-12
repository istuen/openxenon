# manual-dev-fix

## MODIFIED Requirements

### Requirement: 替换"Core 引擎守护进程"描述

**FROM:**

```markdown
# 克隆后运行
./dist/oxn init    # 初始化项目，连接 Core 引擎守护进程
```

**TO:**

```markdown
# 克隆后运行
./dist/oxn init    # 初始化项目
```

### Requirement: 修正 git clone URL

**FROM:**

```markdown
git clone https://github.com/istuen/openxenon.git
```

**TO:**

```markdown
git clone https://forgejo.isteed.dev/issac/openxenon.git
# 或
git clone ssh://git@forgejo.isteed.dev/issac/openxenon.git
```
