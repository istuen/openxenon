# /oxn-proof — Proof-First 入口（v0.1.2 catalog 封装）

> **让 OXN 验收，不让人验收。** 这是 IAP 三轴中 **Proof 轴的独立运作**——跳过 Domain/Blueprint 资产化，用 Probe 声明验收标准。

## 目标

让 AI 通过 **语义化白名单** 完成验收：
1. AI 调 `oxn proof probe list` 知道有哪些 probe 可用
2. AI 调 `oxn proof probe describe <name>` 知道每个 probe 接受什么输入
3. AI 调 `oxn proof probe add <proof> <probe> --input-json '{...}'` 追加 probe
4. AI 让 AI 工作（写代码 / 跑命令）
5. 调 `oxn proof run` 让 OXN 跑物理观测 → 写 frozen.json

**封装边界**：AI 永远只看到**语义层**（probe 名称 + 描述 + 输入契约），**不**知道 OXN 内部用什么 ref / param / verdict 逻辑。CLI 帮你翻译。

## 何时用

| 场景 | 用 proof 还是 work？ |
|---|---|
| 「AI 说做完了？让 OXN 验收才算」 | **用 `oxn proof`** ← 本 skill |
| 单个验收场景（dist 产物 + 跑测试） | **用 `oxn proof`** |
| 多 stage 流水线 | 用 `oxn work` + Blueprint |
| 跨域业务 | 用 `oxn work` + Domain |

## 5 个命令（白名单）

| 子命令 | 用途 | AI 看到什么 |
|---|---|---|
| `oxn proof create <name>` | 立 proof 空间 | 文件路径 |
| `oxn proof probe list` | **列出所有 probe** | `{name, description, requiredInputs[]}[]` |
| `oxn proof probe describe <name>` | **详述 probe 输入契约** | `{name, description, inputs[], examples[]}` |
| `oxn proof probe add <proof> <probe> --input-json '{...}'` | 追加 probe | 翻译后的内部存储（不直接显示） |
| `oxn proof run <name>` | 调 OXN 跑探测 → 写 frozen.json | verdict + 详情 + 签名 |
| `oxn proof list` | 列所有 proof | 名称 + verdict |
| `oxn proof show <name>` | 读 frozen.json | 完整 verdict + 签名 |

## 标准 workflow（spec-first）

```
Step 1: AI 先用 probe list / describe 知道 OXN 能验收什么
   oxn proof probe list
   oxn proof probe describe fs-exists

Step 2: AI 创建 proof.oxn（验收规约）
   oxn proof create check-deploy

Step 3: AI 追加 probe（按 describe 给的契约）
   oxn proof probe add check-deploy fs-exists --input-json '{"path":"./dist/index.js"}'
   oxn proof probe add check-deploy shell-exec --input-json '{"command":"bun test","timeout":60000}'

Step 4: AI 工作（写代码 / 跑命令）—— 不调 OXN
   → 注意：AI 看到的是"验收规约"，不会知道 OXN 怎么判 PASS/FAIL

Step 5: AI 调 proof run 让 OXN 验收
   oxn proof run check-deploy
   → Kernel 校验 + Infra 物理观测 + 写 frozen.json

Step 6: AI 读 verdict
   oxn proof show check-deploy
   → FAIL → AI 修复 → 再 run → PASS
```

## 物理边界

```
.openxenon/proofs/
└── check-deploy/
    ├── proof.oxn     ← Probe 声明（OXN 翻译后的内部表示）
    └── frozen.json   ← 判决书（chmod 0o444 + SHA-256，不可改）
```

## 不可篡改性

| 层 | 机制 | 绕过成本 |
|---|---|---|
| OS 层 | chmod 0o444 | 需要 owner 权限 |
| 内容层 | `_xenon_meta.content_hash` = SHA-256 | 改内容 hash 对不上 |

**AI 约束**（CLI 白名单）：
- ✅ 允许：`oxn proof create / list / show / probe list / probe describe / probe add / run`
- ❌ 禁止：直接 `vim .openxenon/proofs/*/frozen.json` / `echo ... > frozen.json` / 任何直写

## IAP 范式对照

```
Proof-First 入口 = IAP 中 Proof 轴的独立运作
├─ Intent 轴被跳过（不写 Domain / Blueprint）
├─ Align 轴被简化（不写 Work / Task / Part DAG）
└─ Proof 轴被激活（probe 声明 → 物理观测 → 纯函数判定 → frozen.json）
```

**核心价值**：让工程师 5 分钟内就感受到 OXN 的核心价值——**AI 假完成，OXN 不会骗自己**。

## 完成标准

- `oxn proof probe list` 返回可用 probe（语义名 + 描述 + 必填输入）
- `oxn proof probe describe <name>` 返回输入契约 + 示例
- `oxn proof probe add <proof> <name> --input-json '{...}'` 成功追加
- `oxn proof run` 返回 verdict + readOnly: true
- `oxn proof show` 返回完整 frozen.json（含签名）

把 `frozenPath` 给工程师审核。**禁止**改 frozen.json。
