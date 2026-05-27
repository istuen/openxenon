## Why

OpenXenon 的 Arsenal（武器库）是工程标准资产的沉淀池，但创建标准资产（Probe/Proof/Stage）需要工程师手动编写 YAML。这种方式效率低且容易出错。通过 `/oxn-forge` 指令，工程师可以用自然语言描述需求，AI 模型降维生成 Draft 资产，经过 Core 引擎的 Zod Schema 校验后，等待工程师确权（promote）成为正式标准。

## What Changes

- 实现 `/oxn-forge` Skill，接收自然语言输入生成 Draft 资产
- AI 生成 Draft 资产后强制暂停，等待工程师审查
- Core 引擎对 Draft 资产**只做 Zod Schema 校验，绝对不执行**
- 实现 `oxn standards inspect` 查看 Draft 资产内容
- 实现 `oxn standards promote` 将 Draft 资产转正为 CANONICAL

## Capabilities

### New Capabilities

- `oxn-forge`: 通过自然语言生成 Draft 标准的指令。AI 接收工程师的定性描述，降维生成 YAML 格式的 Probe/Proof/Stage 定义，存入 DRAFT 目录等待确权。

### Modified Capabilities

- `standards-lifecycle`: 依赖本 Change 建立好的 DRAFT/CANONICAL 生命周期

## Impact

- 新增 `src/skills/oxn-forge.ts` Skill 实现
- 影响 `src/core/standards-loader.ts` 加载 Draft 资产
- 影响 CLI 的 `oxn standards` 命令集
- 引入 Zod 作为 YAML 校验依赖