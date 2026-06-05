# OXN DSL 参考

> OpenXenon v0.1 DSL 完整语法参考。基于 Langium grammar `oxn.langium` 描述。

## 1. 文件扩展名与作用域

| 文件 | 扩展名 | 位置 |
|---|---|---|
| Domain | `.oxn` | `.openxenon/domains/<kebab-case>.oxn` |
| Blueprint | `.oxn` | `.openxenon/blueprints/<name>.oxn` |
| Probe | `.oxn` | builtin 资产（`@oxn/probe/*`） |
| Part | `.oxn` | builtin 资产（`@oxn/part/*`） |
| Work | `.oxn` | `.openxenon/works/<work>/work.oxn` |
| Task | `.oxn` | `.openxenon/works/<w>/tasks/<t>/task.oxn` |

## 2. 顶层声明

```bnf
OXNDocument = Entity+

Entity =
    ProbeDeclaration
  | PartDeclaration
  | BlueprintDeclaration
  | DomainDeclaration
  | WorkDeclaration
```

## 3. Domain

```bnf
DomainDeclaration = 'domain' name=STRING '{'
    ('description' '=' value=STRING ';')?
    ('term' '{' (terms+=TermDecl)+ '}')?
    ('ban' '{' (bans+=STRING)+ '}')?
    ('invariant' '{' (invariants+=InvariantDecl)+ '}')?
    ('context_map' '{' (imports+=ContextMapImport)* '}')?
'}'

TermDecl        = key=STRING ':' value=STRING
InvariantDecl   = value=STRING
ContextMapImport = 'imports' target=STRING 'as' alias=STRING
```

### 完整示例

```oxn
domain "MemberContext" {
  description = "会员限界上下文"

  term {
    "Member":   "注册会员实体",
    "Register": "提交注册表单"
  }

  ban { "User", "Customer" }

  invariant { "密码任何时候都不能明文存储" }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

## 4. Blueprint

```bnf
BlueprintDeclaration = 'blueprint' name=STRING '{'
    ('description' '=' value=STRING ';')?
    ('version' '=' version=NUMBER ';')?
    ('props' '=' '[' ... ']' ';')?           # 数组形式
    (props+=PropDeclaration)*
    (partSlots+=PartSlotDeclaration)*
'}'

PartSlotDeclaration = 'slot' name=STRING '{'
    ('deps' '=' '[' (deps+=STRING)* ']' ';')?
    ('observe' '=' '[' (observes+=ObserveDeclaration)* ']' ';')?
'}'

ObserveDeclaration = name=STRING
PropDeclaration    = name=STRING type=STRING
```

### 完整示例

```oxn
blueprint "dev-workflow" {
  description = "开发工作流"
  version = 1

  prop "env" { type = string; default = "dev" }

  slot "build"  { deps = [] }
  slot "test"   { deps = ["build"] }
  slot "verify" { deps = ["test"] observe = ["ShellExec"] }
}
```

## 5. Work

```bnf
WorkDeclaration = 'work' name=STRING '{'
    (context=WorkContext)?
    (domains+=DomainRefDecl)*
    (blueprints+=BlueprintRefDecl)*
    (parts+=PartRefDecl)*
    (probes+=ProbeRefDecl)*
    (tasks+=TaskDeclaration)*
'}'

WorkContext = 'context' '{'
    ('goal' '=' goal=STRING ';')?
    ('constraints' '=' '[' (constraints+=STRING)* ']' ';')?
    (loopPolicy=LoopPolicy)?
'}'

LoopPolicy = 'loop_policy' '{'
    ('max_iterations' '=' maxIterations=NUMBER ';')?
'}'

DomainRefDecl    = 'domain'    name=STRING ('as' alias=STRING)? 'ref' ref=STRING ';'
BlueprintRefDecl = 'blueprint' name=STRING ('as' alias=STRING)? 'ref' ref=STRING ';'
PartRefDecl      = 'part'      name=STRING ('as' alias=STRING)? 'ref' ref=STRING ';'
ProbeRefDecl     = 'probe'     name=STRING ('as' alias=STRING)? 'ref' ref=STRING ';'
```

### 完整示例

```oxn
work "Onboarding" {
  context {
    goal = "完成新会员注册";
    constraints = ["不能直接读订单库"];
    loop_policy { max_iterations = 5 }
  }

  domain "MemberContext"   ref "@prj/domains/MemberContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "RegisterMember" {
    domain "MemberContext";
    blueprint "dev-workflow";
    part "build" { skill_context = "实现 Member 注册" }
    deps = [];
  }
}
```

## 6. Task

```bnf
TaskDeclaration = 'task' name=STRING '{'
    ('domain' domain=STRING)?
    ('blueprint' blueprint=STRING)?
    (parts+=TaskPartDecl)*
    (deps=TaskDeps)?
'}'

TaskDeps = '[' (deps+=STRING (',' deps+=STRING)*)? ']'

TaskPartDecl = 'part' name=STRING '{'
    ('skill_context' '=' skill_context=STRING)?
    (probes+=TaskProbeDecl)*
'}'

TaskProbeDecl = 'probe' name=STRING 'ref' ref=STRING ('params' '=' ...)?
```

### 完整示例

```oxn
task "register-member" {
  domain "MemberContext";
  blueprint "dev-workflow";

  part "build" { skill_context = "实现 Member 注册，遵循 Member 命名，禁用 User/Customer" }
  part "test"  { skill_context = "写 Member 注册的单元测试" }
}
```

## 7. Probe / Part

### 7.1 Probe（builtin 资产）

```bnf
ProbeDeclaration = 'probe' name=STRING '{'
    ('description' '=' value=STRING ';')?
    (props+=PropDeclaration)*
    (output+=ProbeOutputDeclaration)?
'}'
```

### 7.2 Part（builtin 资产）

```bnf
PartDeclaration = 'part' name=STRING '{'
    ('description' '=' value=STRING ';')?
    (props+=PropDeclaration)*
    (probes+=PartProbeDeclaration)*
    (refs+=ExecutionRef)*
'}'

PartProbeDeclaration = 'probe' name=STRING 'ref' ref=STRING
ExecutionRef = 'execution' name=STRING
```

## 8. 类型系统

```bnf
TypeReference = PrimitiveType | GenericType | EnumType | AnyType

PrimitiveType returns string = 'string' | 'number' | 'boolean'
EnumType      returns string = 'enum' '(' values+=STRING (',' values+=STRING)* ')'
GenericType   = container=STRING '<' inner=TypeReference '>'
AnyType       = 'any'
```

支持的 prop type：

| 语法 | 含义 |
|---|---|
| `type = string` | 字符串 |
| `type = number` | 数字 |
| `type = boolean` | 布尔 |
| `type = enum("a", "b", "c")` | 枚举 |
| `type = any` | 任意类型 |

## 9. Ref 作用域

```bnf
ref = '@oxn' | '@prj' | '@glo'
```

| 作用域 | 路径 | 含义 |
|---|---|---|
| `@oxn` | `@oxn/<type>/<name>` | 内置资产（OpenXenon 自带） |
| `@prj` | `@prj/<type>/<name>` | 项目内资产 |
| `@glo` | `@glo/<type>/<name>` | 全局资产 |

**查找优先级**：`@prj` > `@glo` > `@oxn`

## 10. 关键字

| 关键字 | 用途 |
|---|---|
| `domain` | Domain 实体 / 资源引用 |
| `blueprint` | Blueprint 实体 / 资源引用 / Task 内 align |
| `part` | Part 实体 / 资源引用 / Task 内 align 到 slot |
| `probe` | Probe 实体 / 资源引用 / Task 内执行 |
| `work` | Work 实体 |
| `task` | Task 实体 / align |
| `description` | 描述 |
| `term` | 核心词汇 |
| `ban` | 禁用词 |
| `invariant` | 业务不变量 |
| `context_map` | 跨域映射 |
| `slot` | Blueprint 拓扑节点 |
| `deps` | 依赖列表 |
| `observe` | 物理观测信号 |
| `prop` | 属性 |
| `context` | Work 上下文 |
| `goal` | Work 目标 |
| `constraints` | 约束列表 |
| `loop_policy` | 循环策略 |
| `max_iterations` | 最大循环次数 |
| `skill_context` | Part 执行指令 |
| `ref` | 资源引用 |
| `as` | 别名 |
| `version` | 版本号 |
| `imports` | context_map 导入 |

## 11. 完整 EBNF

完整 grammar 见仓库根目录：

```
src/oxn-dsl/langium/oxn.langium
```

每次 grammar 变更后运行 `pnpm build` 重新生成 AST。

## 12. 下一章

- [CLI 命令参考](./cli-reference.md)
- [Probe 类型参考](./probe-types.md)
- [State Schema 参考](./state-schema.md)
