---
entity: domain
version: 0.3.0
name: IntentDomain
oxn-source-sha: f02f24bbe16b7dddb01fb6287906e821907652cbc86e0a04f9db0ed7b14b9d8d
synced-at: 2026-07-08T13:52:19.211Z
---

# Domain: IntentDomain

> Intent 轴统一词汇：CLI 入口、OXL 自身、Program 业务概念三件套的合并域；与 align-domain / proof-domain 通过 IAP 三轴分工隔离

## Terms

### Command
- desc: CLI 顶级命令（init/work/leader/blueprint/domain/...）

### SubCommand
- desc: 命令的子命令（如 work task create）

### Arg
- desc: 命令参数（必填或可选）

### OutputFormat
- desc: 输出格式（human/json/yaml/html/md）

### ErrorCode
- desc: 标准化错误码（OXN_ 前缀；具体字典见 iap-error-context.oxn）

### Skill
- desc: 嵌入到 AI 助手的命令手册（.opencode/skills/；详细见 align-domain）

### Grammar
- desc: Langium 语法定义（.langium 文件）

### Schema
- desc: Zod 校验 schema，对应语法的中间表示

### Validator
- desc: 语法/语义校验器，编译期检查

### Compiler
- desc: 把 .oxn 编译为 AssemblyIR 的编译器

### AST
- desc: 抽象语法树，Langium 解析产物

### IR
- desc: AssemblyIR 中间表示，Zod 校验的强类型数据

### Token
- desc: 词法单元，由 lexer 产生

### Entity
- desc: 顶层声明（Probe/Part/Blueprint/Domain/Work）

### SourceFile
- desc: 项目里的 .ts/.js/.tsx/.jsx 源文件

### Module
- desc: 有具名 exports 的源文件（运行时真相 = 实际导出列表）

### TestCase
- desc: *.test.ts 里的单个 test(name, fn) 调用

### Package
- desc: package.json 里的 dependencies / devDependencies 项

### BuildArtifact
- desc: tsc / bun build 生成的 dist/ 产物（V2 future）

### APIEndpoint
- desc: HTTP URL pattern + method（GET/POST/...）

## Bans

### forbidden-constructs
- items:
  - Flag
  - Option
  - Switch
  - ParserImpl
  - LexerImpl
  - GrammarFile
  - image-only-asset
  - absoluteFileURL
  - var
  - document.
  - window.
- desc: Flag, Option, Switch, ParserImpl, LexerImpl, GrammarFile, image-only-asset, absoluteFileURL, var, document., window.

## Invariants

### inv-1
- value: 所有错误码必须以 OXN_ 前缀（便于过滤）；完整字典见 iap-error-context.oxn 11 总数收敛

### inv-2
- value: AI 调用必须传 --json，CLI 默认 human 模式

### inv-3
- value: 子命令名使用 kebab-case（与 align-domain 的 Skill ID 命名一致）

### inv-4
- value: oxn.langium 是 DSL 的唯一权威来源，AST 由 langium generate 自动产出

### inv-5
- value: Zod schema 必须与 grammar 一一对应，缺一个就 broken

### inv-6
- value: 所有 validator 必须通过 registerOxnValidators 注册，否则不生效

### inv-7
- value: 新增 grammar 字段时必须保持向后兼容（旧 .oxn 文件仍能解析）

### inv-8
- value: 6 个 term 与 6 个 P1 Probes 一一对应（test-pass/TestCase 等）

### inv-9
- value: Probe 名以 kebab-case 暴露给 AI（如 test-pass），内部以 snake_case 注册（如 test_pass）

### inv-10
- value: test-pass 复用 shell-exec 内部 API（DRY：probe 不重复 spawn 逻辑）

### inv-11
- value: deps-resolved 优先解析 bun.lock，失败 fallback package.json 即可

### inv-12
- value: http-responds 默认 timeout 5s（防止 AI 触发真实网络挂起）

### inv-13
- value: file-exports 默认在子进程跑（防止顶层副作用污染主进程）

### inv-14
- value: CLI/DSL/Program 词汇归 Intent 轴；Align 轴专属词（Work/Task/Part/RefPool）见 align-domain.oxn

### inv-15
- value: Probe 注册表与 IAPError 双轨制见 proof-domain.oxn（Runtime 模块亦在彼处）

### inv-16
- value: 本域与 L0L3Context.oxn 正交：本域约束业务 Intent 词汇，L0L3 约束代码分层
