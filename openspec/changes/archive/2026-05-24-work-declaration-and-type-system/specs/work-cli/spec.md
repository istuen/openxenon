## ADDED Requirements

### Requirement: work CLI 指令

系统 SHALL 提供 `work` CLI 指令，用于操作 Work 资产。

**功能范围：**
- `work init <name> --type <type>`：初始化新的 Work
- `work list`：列出所有 Work
- `work validate <path>`：验证 work 文件

#### Scenario: work init 创建新 Work
- **WHEN** 执行 `work init "my-work" --type task`
- **THEN** 在 `.openxenon/work/<type>/` 目录下创建 work 文件

#### Scenario: work list 列出 Work
- **WHEN** 执行 `work list`
- **THEN** 列出所有已注册的 Work，显示 name、type、path

### Requirement: oxn-work skill

系统 SHALL 提供 `oxn-work` skill，复制 `oxn-task` 的功能并替换 task → work。

#### Scenario: oxn-work skill 加载
- **WHEN** 加载 `oxn-work` skill
- **THEN** skill 包含 work 相关的命令和模板

#### Scenario: skill 模板生成
- **WHEN** 使用 `oxn-work` 生成 Work 模板
- **THEN** 生成符合 WorkDeclaration 语法的 `.oxn` 文件

### Requirement: work 目录结构

Work 创建时 SHALL 根据 `type` 在 `.openxenon/work/<type>/` 下创建文件。

**目录结构：**
```
.openxenon/
└── work/
    └── task/
        └── my-work.oxn
    └── flow/
        └── my-flow.oxn
```

#### Scenario: 创建 task type Work
- **WHEN** 执行 `work init "my-work" --type task`
- **THEN** 在 `.openxenon/work/task/` 下创建 `my-work.oxn`

#### Scenario: 创建自定义 type Work
- **WHEN** 执行 `work init "my-work" --type pipeline`
- **THEN** 在 `.openxenon/work/pipeline/` 下创建 `my-work.oxn`

### Requirement: work validate 验证

`work validate` SHALL 验证 work 文件的语法和语义。

**校验项：**
- 语法正确性（Langium 解析）
- type 1:1 匹配校验
- slot 引用存在性校验

#### Scenario: validate 通过
- **WHEN** 执行 `work validate .openxenon/work/task/my-work.oxn`
- **AND** 文件语法正确、type 匹配、slot 存在
- **THEN** 返回验证成功

#### Scenario: validate 失败
- **WHEN** 执行 `work validate .openxenon/work/task/my-work.oxn`
- **AND** 文件存在 type 不匹配
- **THEN** 返回验证失败及错误详情