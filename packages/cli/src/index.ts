/**
 * OXN CLI — 薄组合调用层入口（占位）
 *
 * v0.6 阶段说明：当前 src/cli/ 尚未迁移到 packages/cli/src/。
 * 当前此文件仅作为 CLI package 入口占位，迁移完成后才接入真实命令。
 *
 * 迁移后预期结构：
 *   packages/cli/src/
 *     index.ts        ← 当前文件（CLI 主入口，定义所有 subCommands）
 *     commands/       ← domain.ts / blueprint.ts / work.ts / proof.ts / insight.ts / pool.ts
 *     output.ts       ← 输出格式化 + 错误分类
 *     i18n.ts         ← 多语言资源
 */

export const CLI_VERSION = '0.6.0'
export const CLI_STATUS = 'monorepo-skeleton'
