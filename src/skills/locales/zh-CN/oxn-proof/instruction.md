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
| OS 层 | chmod 0o444（覆盖前 owner 自动抬位 0o644 → 写 → try/finally 回锁 0o444） | writer 内部完成，AI / 工程师无感 |
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

---

## AI 错误处理：读 `error.action` 字段

`oxn proof *` 命令出错时，CLI 输出 JSON 包含 `error.action` 字段。**AI 读这个字段决策下一步**，不要解析 `message` 字符串。

### Verdict: FAIL 怎么读？

```bash
oxn proof show check-deploy
```
读 `frozen.json.verdict` 字段：
- `verdict === 'PASSED'` → 任务通过，AI 可继续
- `verdict === 'FAILED'` → 任务失败（**正常业务结果，不是异常**），AI 自己改代码重 run

### 业务异常（IAPError）怎么读？

```json
{
  "ok": false,
  "error": {
    "code": "IAP_PROOF_INFRA_FAIL",
    "axis": "PROOF",
    "action": "YIELD_TO_HUMAN",
    "message": "Probe 无法访问目标资源",
    "context": { "path": "./dist", "systemError": "EACCES" }
  }
}
```

**AI 决策表**（按 `action` 字段）：

| `action` 值 | AI 下一步动作 |
|---|---|
| `AUTONOMOUS_RETRY` | AI 自己改代码/参数重试（不改 proof） |
| `YIELD_TO_HUMAN` | AI 停止当前任务，让人类修（环境/需求问题 AI 改不了） |

**两个 `action` 值之外的字段**（AI 不需要关心，但要知道存在）：
- `code` — 错误全名（`IAP_<AXIS>_<CODE>`）
- `axis` — 哪个 IAP 轴（INTENT/ALIGN/PROOF）
- `message` — 人类可读描述
- `context` — 机器可读字段（test/debug 用）

### 引擎崩溃（OXNCrash）AI 看不到

`OXN_CRASH_*` 错误走 stderr 通道，AI Skill 收不到。**如果你的命令莫名其妙 exit 2 没输出，那是引擎崩了，AI 应停止工作，通知工程师**。

### 实战示例

```bash
# 1. AI 跑 proof
$ oxn proof run check-deploy
{
  "ok": false,
  "error": {
    "code": "IAP_PROOF_INFRA_FAIL",
    "axis": "PROOF",
    "action": "YIELD_TO_HUMAN",
    "message": "无法访问 ./dist/index.js",
    "context": { "path": "./dist/index.js", "systemError": "EACCES" }
  }
}

# 2. AI 读 action = YIELD_TO_HUMAN → 知道不能自己改
# 3. AI 通知用户："dist/index.js 没有读权限，请运行 chmod +r ./dist/index.js"
# 4. 用户修后 AI 重新跑
```

```bash
# 1. AI 跑 proof
$ oxn proof run check-deploy
{
  "ok": false,
  "error": {
    "code": "IAP_ALIGN_CHECKLIST_MISSING",
    "axis": "ALIGN",
    "action": "YIELD_TO_HUMAN",
    "message": "task 'scaffold' 的 part 'scaffold' 缺少必填的 intent_checklist 字段",
    "context": { "taskName": "scaffold", "partName": "scaffold", "missingField": "intent_checklist" }
  }
}

# 2. AI 读 action = YIELD_TO_HUMAN → 知道不能自己改
# 3. AI 通知用户："part.scaffold 缺 intent_checklist，请在 task.oxn 补上开工前的 4 问对齐"
# 4. 用户补后 AI 重新跑
```

**不要**：
- ❌ 用正则解析 `message` 字符串
- ❌ 看到 `code: 'IAP_*'` 就 assume 是 YIELD_TO_HUMAN
- ✅ 永远先读 `action` 字段
