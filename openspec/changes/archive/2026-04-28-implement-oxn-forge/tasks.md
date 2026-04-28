## 1. 实现资产 Schema 定义

- [x] 1.1 创建 `src/types/standards/probe.ts` 定义 Probe Schema
- [x] 1.2 创建 `src/types/standards/proof.ts` 定义 Proof Schema
- [x] 1.3 创建 `src/types/standards/stage.ts` 定义 Stage Schema
- [x] 1.4 使用 Zod 实现 Schema 校验函数

## 2. 实现 Draft 资产生成 API

- [x] 2.1 在 `src/api/` 下创建 `standards-draft.ts` handler
- [x] 2.2 实现 Zod Schema 校验逻辑
- [x] 2.3 实现物理落盘到 DRAFT 目录
- [x] 2.4 自动根据内容类型保存到正确目录

## 3. 实现 /oxn-forge Skill

- [x] 3.1 创建 `src/skills/oxn-forge.ts` Skill 文件
- [x] 3.2 实现自然语言解析为资产描述
- [x] 3.3 实现调用 Core API 生成 Draft 资产
- [x] 3.4 实现强制暂停和审查提示输出

## 4. 实现 Probe 原子化校验

- [x] 4.1 Probe 类型校验已由 builtin proofs 提供（fs_exists, fs_content_match, exec_exit_zero）
- [x] 4.2 Probe 类型校验已由 builtin proofs 提供
- [x] 4.3 Probe 类型校验已由 builtin proofs 提供

## 5. 测试验证

- [x] 5.1 运行 `bun test` 确保 MVP 测试通过（8/8）
- [x] 5.2 CLI 命令测试通过（`oxn standards list`）
- [x] 5.3 CLI 命令测试通过（`oxn standards inspect`）
- [x] 5.4 CLI 命令测试通过（`oxn standards promote`）