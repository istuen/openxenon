# OpenXenon 知识架构改进方案

> 版本：v1.0  
> 日期：2026-08-07  
> 状态：Draft for Discussion

---

## 一、背景与动机

### 1.1 当前问题

OpenXenon 现有的 Asset 体系（Domain / Workflow / Stack）存在以下设计张力：

1. **逻辑学概念外溢**：早期设计受形式逻辑影响，引入了"公理/定理"等概念，但这些区分对工程师无意义，增加了认知负担。
2. **结构碎片化**：每条知识一个文件的设计导致文件数量膨胀，维护困难。
3. **重复与同步问题**：Blueprint 若展开 Asset 内容，既重复又难以同步；若不做引用，则上下文不完整。
4. **技术实现混入业务域**：Stack 的技术约束（如 Controller 禁止 DB facade）错误地出现在 Domain 或 Workflow 中，职责不清。
5. **推理质量责任错位**：OXN 试图承担 LLM 的推理职责，但推理质量本质上取决于 LLM 能力和工程师定义质量，不应由框架兜底。

### 1.2 设计哲学

> **OXN 是协作工具，不是推理引擎。它的核心价值是提供稳定的知识结构、可靠的引用机制和客观的验证手段。推理质量由 LLM 能力和工程师实践决定。**

---

## 二、核心概念体系

### 2.1 术语表

| 术语 | 英文 | 定义 | 示例 |
|---|---|---|---|
| **Definition** | Definition | 最小知识单元。一条被明确定义的项目知识，以自然语言书写 | `PHP 8.1+`、`商品下单必须生成订单` |
| **Group** | Group | Definition 的关注点分组。一个 Asset 内按主题将相关 Definition 组织在一起 | `Foundation`、`Auth`、`Business Rules` |
| **Asset Type** | Asset Type | Definition 的内聚范围分类。每种类型代表一个知识维度 | `Stack`、`Domain`、`Workflow` |
| **Asset** | Asset | 一个 Markdown 文件，属于某 Asset Type，内部按 Group 组织 Definition | `laravel-stack.md`、`ecommerce-domain.md` |
| **Reference** | Reference | Blueprint 对 Asset 中 Group 的声明式引用 | `[[laravel-stack/Foundation]]` |
| **Blueprint** | Blueprint | 聚合多个 Asset 的容器，只声明引用，不展开内容 | `ecommerce-api.md` |
| **Context** | Context | Work 运行时，系统根据 Blueprint 的 Reference 动态加载的 Definition 集合 | LLM 实际看到的提示词上下文 |
| **Goal** | Goal | 工程师下达给 Work 的任务目标 | `实现商品下单功能` |
| **Probe** | Probe | 对 Work 产物进行客观验证的机制 | 文件存在性检查、静态分析、测试运行 |

### 2.2 概念关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Asset（知识定义层）                       │
│                                                                 │
│  ┌─ Asset Type: Stack ──────────────────────────────────────┐  │
│  │  File: laravel-stack.md                                  │  │
│  │  ┌─ Group: Foundation ─────────────────────────────────┐  │  │
│  │  │ • PHP 8.1+                                        │  │  │
│  │  │ • Laravel 10                                      │  │  │
│  │  │ • MySQL 8.0                                       │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌─ Group: Auth ──────────────────────────────────────┐  │  │
│  │  │ • 使用 Laravel Sanctum 做 API 认证                  │  │  │
│  │  │ • 使用 Policy 类做授权                              │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌─ Group: Data Access ──────────────────────────────┐  │  │
│  │  │ • 数据访问通过 Eloquent Model                       │  │  │
│  │  │ • 禁止：Controller 中直接使用 DB facade            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Asset Type: Domain ────────────────────────────────────┐  │
│  │  File: ecommerce-domain.md                              │  │
│  │  ┌─ Group: Core Entities ────────────────────────────┐  │  │
│  │  │ • 商品：可供销售的产品单元，有 SKU、价格、库存      │  │  │
│  │  │ • SKU：库存量单位，唯一标识商品规格                │  │  │
│  │  │ • 订单：用户购买商品的记录，含订单项、总价、状态    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌─ Group: Business Rules ───────────────────────────┐  │  │
│  │  │ • 商品下单必须生成订单                              │  │  │
│  │  │ • 订单发货后自动扣除对应 SKU 库存                   │  │  │
│  │  │ • 取消已支付的订单需触发退款流程                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Asset Type: Workflow ─────────────────────────────────┐  │
│  │  File: dev-process.md                                  │  │
│  │  ┌─ Group: Phases ───────────────────────────────────┐  │  │
│  │  │ • 流程阶段：需求评审 → 技术设计 → 编码 → 测试 → 部署│  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌─ Group: Practices ────────────────────────────────┐  │  │
│  │  │ • 每个功能开发前必须编写测试用例                    │  │  │
│  │  │ • 数据库变更必须附带迁移脚本                      │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  （未来可扩展）                                                  │
│  ┌─ Asset Type: Security ────────────────────────────────┐  │
│  ┌─ Asset Type: Performance ──────────────────────────────┐  │
│  ┌─ Asset Type: BusinessFlow ────────────────────────────┐  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Blueprint（聚合层）                          │
│                                                                 │
│  File: ecommerce-api.md                                        │
│                                                                 │
│  只声明引用，不展开内容：                                        │
│                                                                 │
│  ## Stack                                                       │
│  - [[laravel-stack/Foundation]]                                 │
│  - [[laravel-stack/Auth]]                                       │
│  - [[laravel-stack/Data Access]]                                │
│                                                                 │
│  ## Domain                                                      │
│  - [[ecommerce-domain/Core Entities]]                           │
│  - [[ecommerce-domain/Business Rules]]                          │
│                                                                 │
│  ## Workflow                                                    │
│  - [[dev-process/Phases]]                                      │
│  - [[dev-process/Practices]]                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Work（执行层）                            │
│                                                                 │
│  Goal: 实现商品下单功能                                         │
│                                                                 │
│  Context（系统动态组装，非人工编写）：                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ## Stack / Foundation                                    │  │
│  │ • PHP 8.1+                                               │  │
│  │ • Laravel 10                                             │  │
│  │ • MySQL 8.0                                              │  │
│  │ ## Stack / Auth                                           │  │
│  │ • 使用 Laravel Sanctum 做 API 认证                        │  │
│  │ • 使用 Policy 类做授权                                    │  │
│  │ ## Stack / Data Access                                    │  │
│  │ • 数据访问通过 Eloquent Model                              │  │
│  │ • 禁止：Controller 中直接使用 DB facade                   │  │
│  │ ## Domain / Core Entities                                 │  │
│  │ • 商品：可供销售的产品单元...                              │  │
│  │ • SKU：库存量单位...                                      │  │
│  │ ## Domain / Business Rules                                │  │
│  │ • 商品下单必须生成订单                                     │  │
│  │ • 订单发货后自动扣除对应 SKU 库存                          │  │
│  │ ## Workflow / Phases                                      │  │
│  │ • 流程阶段：需求评审 → 技术设计 → 编码 → 测试 → 部署      │  │
│  │ ## Workflow / Practices                                   │  │
│  │ • 每个功能开发前必须编写测试用例                           │  │
│  │ • 数据库变更必须附带迁移脚本                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│  LLM 基于 Context + Goal 编排 Tasks → 执行 → Probe 验证         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、Asset 规范

### 3.1 文件格式

- **格式**：Markdown（`.md`）
- **位置**：`assets/<asset-type>/<asset-name>.md`
- **命名**：文件名使用小写字母 + 连字符，例如 `laravel-stack.md`、`ecommerce-domain.md`
- **编码**：UTF-8

### 3.2 结构模板

```markdown
# <Asset Type>: <Asset Name>

## <Group 1 名称>
- <Definition 1>
- <Definition 2>
- <Definition 3>

## <Group 2 名称>
- <Definition 4>
- <Definition 5>

## <Group 3 名称>
- <Definition 6>
```

### 3.3 编写规则

1. **Definition 必须是自然语言**：完整句子或短语，不加编号、不加前缀、不加 ID 标签
2. **Group 名称使用自然语言**：例如 `Foundation`、`Auth`、`Data Access`、`Core Entities`
3. **每个 Definition 一行**：以 `-` 开头，后面跟自然语言描述
4. **不区分公理/定理**：所有知识统一视为 Definition
5. **不做机器式引用**：Definition 之间不需要互相引用 ID，自然语言描述即可

### 3.4 完整示例

#### `assets/stack/laravel-stack.md`

```markdown
# Stack: Laravel 技术栈

## Foundation
- PHP 8.1+
- Laravel 10
- MySQL 8.0

## Auth
- 使用 Laravel Sanctum 做 API 认证
- 使用 Policy 类做授权

## Data Access
- 数据访问通过 Eloquent Model
- 禁止：Controller 中直接使用 DB facade

## Quality
- 每个 Controller 应有对应测试文件
- 数据库变更必须附带迁移脚本
```

#### `assets/domain/ecommerce-domain.md`

```markdown
# Domain: 电商业务

## Core Entities
- 商品：可供销售的产品单元，有 SKU、价格、库存
- SKU：库存量单位，唯一标识商品规格
- 订单：用户购买商品的记录，包含订单项、总价、状态
- 订单状态：待支付、已支付、已发货、已完成、已取消

## Business Rules
- 商品下单必须生成订单
- 订单发货后自动扣除对应 SKU 库存
- 取消已支付的订单需触发退款流程
```

#### `assets/workflow/dev-process.md`

```markdown
# Workflow: 开发流程

## Phases
- 流程阶段：需求评审 → 技术设计 → 编码 → 测试 → 部署

## Practices
- 每个功能开发前必须编写测试用例
```

---

## 四、Blueprint 规范

### 4.1 文件格式

- **格式**：Markdown（`.md`）
- **位置**：`blueprints/<blueprint-name>.md`
- **命名**：文件名使用小写字母 + 连字符

### 4.2 结构模板

```markdown
# Blueprint: <名称>

## <Asset Type 1>
- [[<asset-name>/<Group 名称>]]
- [[<asset-name>/<Group 名称>]]

## <Asset Type 2>
- [[<asset-name>/<Group 名称>]]

## <Asset Type 3>
- [[<asset-name>/<Group 名称>]]
- [[<asset-name>/<Group 名称>]]
```

### 4.3 引用语法

| 语法 | 含义 | 示例 |
|---|---|---|
| `[[asset-name]]` | 引用整个 Asset 的所有 Group | `[[laravel-stack]]` |
| `[[asset-name/Group 名称]]` | 引用 Asset 中的某个 Group | `[[laravel-stack/Foundation]]` |
| `[[asset-name/Group A, Group B]]` | 引用 Asset 中的多个 Group | `[[laravel-stack/Foundation, Auth]]` |

### 4.4 编写规则

1. **只声明引用**：Blueprint 不展开 Definition 内容
2. **二级标题 = Asset Type**：每个引用的 Asset Type 作为一个二级标题
3. **引用列表**：在对应 Asset Type 下，列出需要引用的 Asset 和 Group
4. **不写 Context 模板**：Context 的组装方式由系统决定，不在 Blueprint 中预设
5. **可引用整个 Asset 或部分 Group**：按需选择粒度

### 4.5 完整示例

```markdown
# Blueprint: 电商后端 API

## Stack
- [[laravel-stack/Foundation]]
- [[laravel-stack/Auth]]
- [[laravel-stack/Data Access]]
- [[laravel-stack/Quality]]

## Domain
- [[ecommerce-domain/Core Entities]]
- [[ecommerce-domain/Business Rules]]

## Workflow
- [[dev-process/Phases]]
- [[dev-process/Practices]]
```

### 4.6 技术栈替换场景

当技术栈从 Laravel 切换到 Go 时：

```markdown
# Blueprint: 电商后端 API

## Stack
- [[go-stack/Foundation]]
- [[go-stack/Auth]]
- [[go-stack/Data Access]]
- [[go-stack/Quality]]

## Domain
- [[ecommerce-domain/Core Entities]]
- [[ecommerce-domain/Business Rules]]

## Workflow
- [[dev-process/Phases]]
- [[dev-process/Practices]]
```

**Blueprint 结构完全不变，只换了引用的 Asset 文件。** Domain 和 Workflow 无需任何修改。

---

## 五、Work 与 Context 生成

### 5.1 Work 的构成

```
Work = Goal + Blueprint 引用 + 动态生成的 Context
```

- **Goal**：工程师用自然语言描述的目标
- **Blueprint 引用**：指向某个 Blueprint 文件
- **Context**：系统根据 Blueprint 的 Reference 动态加载的 Definition 集合

### 5.2 Context 生成流程

```
┌────────────────────────────────────────────────────────────────┐
│  Step 1: 解析 Blueprint                                       │
│  读取 Blueprint 文件，提取所有 [[asset/group]] 引用              │
├────────────────────────────────────────────────────────────────┤
│  Step 2: 加载 Asset                                           │
│  根据引用路径，读取对应的 Asset 文件                            │
├────────────────────────────────────────────────────────────────┤
│  Step 3: 提取 Definition                                      │
│  从 Asset 的指定 Group 中提取所有 Definition 条目               │
├────────────────────────────────────────────────────────────────┤
│  Step 4: 组装 Context                                         │
│  按 Asset Type / Group 分组，生成 LLM 友好的提示词文本          │
├────────────────────────────────────────────────────────────────┤
│  Step 5: 注入 Goal                                            │
│  将 Goal 附加到 Context 末尾，形成完整提示词                    │
├────────────────────────────────────────────────────────────────┤
│  Step 6: 交付 LLM                                             │
│  将完整 Context + Goal 交给 LLM，由其编排 Tasks 并执行          │
└────────────────────────────────────────────────────────────────┘
```

### 5.3 Context 输出格式（LLM 视角）

```
## Stack / Foundation
- PHP 8.1+
- Laravel 10
- MySQL 8.0

## Stack / Auth
- 使用 Laravel Sanctum 做 API 认证
- 使用 Policy 类做授权

## Stack / Data Access
- 数据访问通过 Eloquent Model
- 禁止：Controller 中直接使用 DB facade

## Domain / Core Entities
- 商品：可供销售的产品单元，有 SKU、价格、库存
- SKU：库存量单位，唯一标识商品规格
- 订单：用户购买商品的记录，包含订单项、总价、状态
- 订单状态：待支付、已支付、已发货、已完成、已取消

## Domain / Business Rules
- 商品下单必须生成订单
- 订单发货后自动扣除对应 SKU 库存
- 取消已支付的订单需触发退款流程

## Workflow / Phases
- 流程阶段：需求评审 → 技术设计 → 编码 → 测试 → 部署

## Workflow / Practices
- 每个功能开发前必须编写测试用例

---
Goal: 实现商品下单功能
```

### 5.4 OXN 的职责边界

| OXN 负责 | OXN 不负责 |
|---|---|
| 解析 Blueprint 的 Reference | LLM 的推理质量 |
| 加载并组装 Context | Context 的排版优化 |
| 提供 Probe 验证机制 | Definition 的正确性判断 |
| 保证引用可解析、不悬空 | LLM 是否复用已有 Definition |
| 记录 Work 产物与验证结果 | 知识沉淀的自动化决策 |
| 提供稳定的目录结构与文件格式 | 指导 LLM 如何编排 Tasks |

> **OXN 提供结构，LLM 提供智能，工程师提供判断。三者各司其职。**

---

## 六、Probe 验证机制

### 6.1 Probe 与 Definition 的映射

虽然 Definition 是自然语言，但部分 Definition 可以被 Probe 客观验证。映射关系由系统配置，不在 Definition 中声明。

| Definition 示例 | Probe 类型 | 验证方式 |
|---|---|---|
| `PHP 8.1+` | filesystem-probe | 检查 `composer.json` 中的 `php` 版本约束 |
| `每个 Controller 应有对应测试文件` | filesystem-probe | 检查 `tests/` 下是否存在对应测试文件 |
| `数据访问通过 Eloquent Model` | static-analysis | PHPStan 规则检查非 Model 层的 DB 调用 |
| `禁止：Controller 中直接使用 DB facade` | static-analysis | 正则/ AST 扫描 Controller 文件 |
| `数据库变更必须附带迁移脚本` | filesystem-probe | 检查 `database/migrations/` 下是否有新文件 |

### 6.2 Probe 配置位置

Probe 配置独立存放，不污染 Asset 文件：

```
probes/
├── stack-probes.yaml
├── domain-probes.yaml
└── workflow-probes.yaml
```

示例 `probes/stack-probes.yaml`：

```yaml
probes:
  - definition: "PHP 8.1+"
    type: filesystem
    target: "composer.json"
    check: "json_path: require.php >= 8.1"

  - definition: "禁止：Controller 中直接使用 DB facade"
    type: static-analysis
    tool: phpstan
    rule: "no-db-facade-in-controller"

  - definition: "每个 Controller 应有对应测试文件"
    type: filesystem
    pattern: "app/Http/Controllers/*.php"
    expect: "tests/Unit/*Test.php"
```

### 6.3 Probe 执行时机

```
Work 执行完毕 → LLM 产出文件 → OXN Daemon 执行 Probe → 生成 frozen.json
```

`frozen.json` 记录每条 Definition 的验证结果：

```json
{
  "work": "work-2026-implement-order",
  "timestamp": "2026-08-07T10:30:00Z",
  "probes": [
    { "definition": "PHP 8.1+", "result": "pass" },
    { "definition": "禁止：Controller 中直接使用 DB facade", "result": "pass" },
    { "definition": "每个 Controller 应有对应测试文件", "result": "pass" },
    { "definition": "商品下单必须生成订单", "result": "pass" }
  ]
}
```

---

## 七、知识沉淀与演化

### 7.1 反馈回路

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   工程师编写 Asset（Definition）                               │
│        │                                                     │
│        ▼                                                     │
│   Blueprint 引用 Asset 的 Group                               │
│        │                                                     │
│        ▼                                                     │
│   Work：LLM 基于 Context + Goal 编排 Tasks                    │
│        │                                                     │
│        ▼                                                     │
│   执行 Tasks → 产出文件 → Probe 验证                          │
│        │                                                     │
│        ▼                                                     │
│   LLM 在 Work 中发现新模式/规律                                │
│        │                                                     │
│        ▼                                                     │
│   生成候选 Definition → 建议工程师添加                         │
│        │                                                     │
│        ▼                                                     │
│   工程师审阅 → 确认或拒绝 → 写入对应 Asset 的 Group           │
│        │                                                     │
│        └──────────────► 下一次 Work 自动包含新 Definition     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 候选 Definition 的建议格式

LLM 在 Work 结束后输出的建议：

```markdown
## 候选 Definition 建议

### 来源：work-2026-implement-order

**建议添加到 `laravel-stack.md` 的 `Quality` Group：**
- API 登录端点应启用 Rate Limiting

**建议添加到 `ecommerce-domain.md` 的 `Business Rules` Group：**
- 订单金额超过 10000 元需二次确认
```

### 7.3 工程师操作

工程师审阅建议后，直接在对应 Asset 文件中添加一行即可：

```markdown
## Quality
- 每个 Controller 应有对应测试文件
- 数据库变更必须附带迁移脚本
- API 登录端点应启用 Rate Limiting   ← 新增
```

**无需任何特殊操作、无需 ID 管理、无需版本控制——纯 Markdown 编辑。**

---

## 八、目录结构总览

```
project-root/
├── assets/
│   ├── stack/
│   │   ├── laravel-stack.md
│   │   ├── go-stack.md（未来）
│   │   └── ...
│   ├── domain/
│   │   ├── ecommerce-domain.md
│   │   └── ...
│   ├── workflow/
│   │   ├── dev-process.md
│   │   └── ...
│   ├── security/（未来扩展）
│   │   └── ...
│   └── business-flow/（未来扩展）
│       └── ...
│
├── blueprints/
│   ├── ecommerce-api.md
│   └── ...
│
├── probes/
│   ├── stack-probes.yaml
│   ├── domain-probes.yaml
│   └── workflow-probes.yaml
│
├── works/（运行时生成）
│   ├── work-2026-implement-order/
│   │   ├── context.md        （系统生成的 Context）
│   │   ├── tasks.json        （LLM 编排的 Tasks）
│   │   ├── frozen.json       （Probe 验证结果）
│   │   └── candidate-definitions.md （候选 Definition 建议）
│   └── ...
│
└── OXN.toml（项目级配置）
```

---

## 九、Asset Type 扩展指南

### 9.1 新增 Asset Type 的步骤

1. **创建目录**：`assets/<new-type>/`
2. **编写 Asset 文件**：按 Group + Definition 格式书写
3. **在 Blueprint 中引用**：新增对应的二级标题和 Reference
4. **（可选）添加 Probe 配置**：在 `probes/` 下创建对应配置文件

### 9.2 扩展示例：Security Asset Type

#### `assets/security/laravel-security.md`

```markdown
# Security: Laravel 安全规范

## Authentication
- 所有 API 端点必须鉴权
- 密码使用 bcrypt 哈希存储

## Authorization
- 使用 Policy 类控制资源访问权限
- 禁止硬编码权限判断逻辑

## Data Protection
- 禁止在日志中输出用户密码
- 敏感配置项存入环境变量，不入库
```

#### Blueprint 中引用：

```markdown
## Security
- [[laravel-security/Authentication]]
- [[laravel-security/Authorization]]
- [[laravel-security/Data Protection]]
```

**完全适配现有结构，无需修改 OXN 核心代码。**

---

## 十、设计原则总结

### 10.1 五大核心原则

| 原则 | 说明 |
|---|---|
| **工程师友好** | 纯 Markdown、纯自然语言、零前缀、零编号 |
| **单一来源** | 每个 Definition 只在一个 Asset 文件中定义，Blueprint 只引用不复制 |
| **结构稳定** | Asset-Blueprint-Work 三层分离，各层职责清晰，不受彼此变化影响 |
| **可扩展** | 新增 Asset Type 只需建目录 + 写文件 + 引用，无需改框架 |
| **职责分明** | OXN 管结构，LLM 管推理，工程师管判断 |

### 10.2 三层职责对照

| 层 | 负责 | 不负责 |
|---|---|---|
| **Asset** | 定义知识（Definition），按 Group 组织 | 不关心谁引用、怎么用 |
| **Blueprint** | 声明引用哪些 Asset 的哪些 Group | 不展开内容、不做推理 |
| **Work** | 动态加载 Context，执行 Goal | 不预设 Context 格式、不干预 LLM 推理 |

### 10.3 与旧设计的对比

| 维度 | 旧设计 | 新设计 |
|---|---|---|
| 知识单元 | 公理/定理（逻辑学概念） | Definition（工程概念） |
| 组织方式 | 按公理/定理分文件 | 按 Group 内聚 + Asset Type 分类 |
| 文件数量 | 每条知识一个文件 → 膨胀 | 每个 Asset Type 一个文件 → 可控 |
| Blueprint | 重复写或全部展开 | 只声明引用 |
| 技术栈替换 | 需修改多处 | 只换引用的 Asset 文件 |
| LLM 推理 | OXN 试图干预 | OXN 不干预，交给 LLM |
| 工程师门槛 | 需理解逻辑学概念 | 只需写自然语言 |
| 扩展新类型 | 需改框架代码 | 建目录 + 写文件即可 |

---

## 十一、后续待讨论议题

以下议题不在本方案范围内，留待实践后迭代：

1. **Context 组装策略**：系统如何最优地将 Definition 注入 LLM 提示词（优先级排序、摘要压缩、Token 预算管理等）
2. **Probe 自动发现**：能否从 Definition 的自然语言描述中自动推断适用的 Probe 类型
3. **Definition 冲突检测**：当多个 Asset 的 Definition 存在矛盾时，如何提示工程师
4. **Blueprint 版本管理**：当引用的 Asset 发生变更时，Blueprint 如何感知和处理
5. **跨项目 Asset 共享**：多个项目能否共享同一套 Asset 定义
6. **LLM 反馈质量评估**：如何衡量 LLM 在 Work 中利用 Definition 的效果

---

## 附录 A：完整示例（端到端）

### A.1 Asset 文件

`assets/stack/laravel-stack.md`：
```markdown
# Stack: Laravel 技术栈

## Foundation
- PHP 8.1+
- Laravel 10
- MySQL 8.0

## Auth
- 使用 Laravel Sanctum 做 API 认证
- 使用 Policy 类做授权

## Data Access
- 数据访问通过 Eloquent Model
- 禁止：Controller 中直接使用 DB facade

## Quality
- 每个 Controller 应有对应测试文件
- 数据库变更必须附带迁移脚本
```

`assets/domain/ecommerce-domain.md`：
```markdown
# Domain: 电商业务

## Core Entities
- 商品：可供销售的产品单元，有 SKU、价格、库存
- SKU：库存量单位，唯一标识商品规格
- 订单：用户购买商品的记录，包含订单项、总价、状态
- 订单状态：待支付、已支付、已发货、已完成、已取消

## Business Rules
- 商品下单必须生成订单
- 订单发货后自动扣除对应 SKU 库存
- 取消已支付的订单需触发退款流程
```

`assets/workflow/dev-process.md`：
```markdown
# Workflow: 开发流程

## Phases
- 流程阶段：需求评审 → 技术设计 → 编码 → 测试 → 部署

## Practices
- 每个功能开发前必须编写测试用例
```

### A.2 Blueprint 文件

`blueprints/ecommerce-api.md`：
```markdown
# Blueprint: 电商后端 API

## Stack
- [[laravel-stack/Foundation]]
- [[laravel-stack/Auth]]
- [[laravel-stack/Data Access]]
- [[laravel-stack/Quality]]

## Domain
- [[ecommerce-domain/Core Entities]]
- [[ecommerce-domain/Business Rules]]

## Workflow
- [[dev-process/Phases]]
- [[dev-process/Practices]]
```

### A.3 Work 执行

工程师输入：
```
Goal: 实现商品下单功能
Blueprint: ecommerce-api
```

系统自动生成 Context（见第五节 5.3），注入 LLM。LLM 编排 Tasks：

```json
{
  "tasks": [
    {
      "action": "创建 Order Model（使用 Eloquent）",
      "references": ["数据访问通过 Eloquent Model"]
    },
    {
      "action": "创建 OrderController（遵循 RESTful 规范）",
      "references": ["禁止：Controller 中直接使用 DB facade"]
    },
    {
      "action": "创建 OrderService（处理下单逻辑）",
      "references": ["商品下单必须生成订单", "订单发货后自动扣除对应 SKU 库存"]
    },
    {
      "action": "编写 OrderTest",
      "references": ["每个功能开发前必须编写测试用例"]
    }
  ]
}
```

执行完毕 → Probe 验证 → frozen.json → 候选 Definition 建议 → 工程师审阅。

---

> **方案到此结束。核心一句话：Asset 用 Group 组织 Definition，Blueprint 用 Reference 引用 Group，Work 动态组装 Context 交给 LLM。OXN 管结构稳定，LLM 管推理质量，工程师管知识判断。**
