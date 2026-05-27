## ADDED Requirements

### Requirement: Kernel 禁止导入 Infra

Kernel 层的所有模块（包括 `src/kernel/**`）**SHALL NOT** 导入 `src/infra/**` 中的任何模块。Kernel 是兰姆达真空，必须对物理层一无所知。

#### Scenario: Kernel 不应知道 Infra 的存在
- **WHEN** `kernel/lib/custom-proofs-scanner.ts` 尝试导入 `infra/scanner`
- **THEN** ESLint 报错：`🚨 Kernel 是兰姆达真空，不能知道 Infra 的存在！`

#### Scenario: Kernel 导出不包含 scan* 动词
- **WHEN** 代码从 `kernel/index.ts` 导入函数
- **THEN** 不存在 `scan*` 动词的导出（scan 是 I/O 操作的动词）

#### Scenario: 纯函数导出验证
- **WHEN** 检查 `kernel/index.ts` 的导出列表
- **THEN** 所有导出都是纯函数：resolve*, evaluate*, reduce*, validate*, parse*

#### Scenario: 路径函数在 Infra 层
- **WHEN** 需要 `getGlobalProofsPath` 或 `getProjectProofsPath`
- **THEN** 从 `infra/scanner.ts` 导入，不从 `kernel` 导入