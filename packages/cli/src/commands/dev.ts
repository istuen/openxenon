// =============================================================================
// `oxn dev` — DSL 开发工具命名空间
//
// 集中所有底层 DSL 操作：解包 / YAML 迁移。
// 这些命令面向 DSL 作者与 OpenXenon 内部开发，不是日常 AI/工程师工作流的主入口。
//
// 子命令：
//   unpack       — .bundle.oxn → 隔离目录
//   migrate-yaml — YAML Blueprint → OXL
// =============================================================================

import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'

export default defineCommand({
  meta: {
    name: 'dev',
    description: t('dev.description'),
  },
  subCommands: {
    unpack: () => import('./oxn-unpack').then((m) => m.default),
    'migrate-yaml': () => import('./oxn-migrate-cmd').then((m) => m.default),
  },
  run() {
    // No-op: help text is provided by citty
  },
})
