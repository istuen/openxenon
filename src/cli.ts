import { defineCommand, runMain } from 'citty'
import { cliContext } from './cli-context'

const main = defineCommand({
  meta: {
    name: 'oxn',
    version: '1.0.0',
    description: 'OpenXenon CLI - 面向大语言模型的工程化控制引擎'
  },
  subCommands: {
    init: () => import('./cli/init').then(m => m.default),
    daemon: () => import('./cli/daemon').then(m => m.default),
    task: () => import('./cli/task').then(m => m.default),
    arsenal: () => import('./cli/arsenal').then(m => m.default),
    export: () => import('./cli/export').then(m => m.default),
    gc: () => import('./cli/gc').then(m => m.default),
    forge: () => import('./cli/forge').then(m => m.default),
  },
  args: {
    verbose: {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
      default: false
    },
    json: {
      alias: 'j',
      type: 'boolean',
      description: 'Output in JSON format',
      default: false
    }
  },
  async run({ args }) {
    cliContext.setJsonMode(args.json as boolean)
    if (!cliContext.isJsonMode()) {
      console.log('OpenXenon CLI')
      console.log('Run `oxn --help` for usage information')
    }
  }
})

runMain(main)
