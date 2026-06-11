// =============================================================================
// `oxn dev` — DSL 开发工具命名空间
//
// 集中所有底层 DSL 操作：编译 / 解包 / 校验 / YAML 迁移。
// 这些命令面向 DSL 作者与 OpenXenon 内部开发，不是日常 AI/工程师工作流的主入口。
//
// 子命令：
//   compile      — OXL → AssemblyIR（生成 .bundle.oxn + assembly.json + schema.json）
//   unpack       — .bundle.oxn → 隔离目录
//   validate     — 校验 .oxn 文件
//   migrate-yaml — YAML Blueprint → OXL
// =============================================================================

import { defineCommand } from 'citty'
import { t } from '../infra/i18n'

export default defineCommand({
  meta: {
    name: 'dev',
    description: t('dev.description'),
  },
  subCommands: {
    compile: () => import('./oxn-compile').then((m) => m.default),
    unpack: () => import('./oxn-unpack').then((m) => m.default),
    validate: () => import('./oxn-validate').then((m) => m.default),
    'migrate-yaml': () => import('./oxn-migrate-cmd').then((m) => m.default),
  },
  run() {
    // No-op: help text is provided by citty
  },
})
