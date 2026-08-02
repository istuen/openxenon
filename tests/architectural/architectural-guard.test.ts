import { describe, expect, it } from 'bun:test'
import { glob } from 'glob'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_ROOT = join(import.meta.dir, '../..')
const KERNEL_ROOT = join(PROJECT_ROOT, 'packages/engine/src/kernel')
const OXL_ROOT = join(PROJECT_ROOT, 'packages/engine/src/oxl')

describe('Kernel Architectural Guard', () => {
  describe('L0 Kernel 不应导入 L1/L2/L3 模块', () => {
    it('L0 Kernel 不应导入 oxl 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['oxl']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 infra 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['infra']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 builtin 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['builtin']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 hall 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['hall']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 skills 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['skills']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 watcher 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['watcher']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 core 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['core']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 i18n 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['i18n']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 work 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['work']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L0 Kernel 不应导入 cli 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['cli']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
        }
      }
    })
  })

  describe('L0 Kernel 不应使用 require 导入外层模块', () => {
    it('L0 Kernel 不应使用 require 导入 L1/L2/L3 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['oxl', 'infra', 'builtin', 'work', 'cli', 'hall', 'skills', 'watcher', 'core', 'i18n']
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })
  })

  describe('L0 Kernel 不应使用平台 IO 模块', () => {
    it('L0 Kernel 不应使用 require fs', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/require\(['"]fs['"]\)/)
      }
    })

    it('L0 Kernel 不应使用 require crypto', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/require\(['"]crypto['"]\)/)
      }
    })

    it('L0 Kernel 不应使用 require path', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/require\(['"]path['"]\)/)
      }
    })

    it('L0 Kernel 不应使用 require http', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/require\(['"]http['"]\)/)
      }
    })

    it('L0 Kernel 不应使用 require child_process', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/require\(['"]child_process['"]\)/)
      }
    })

    it('L0 Kernel 不应使用 require os', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/require\(['"]os['"]\)/)
      }
    })
  })

  describe('L0 Kernel 不应使用全局变量', () => {
    it('L0 Kernel 不应使用 process.env', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/process\.env/)
      }
    })

    it('L0 Kernel 不应使用 process.stdout', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/process\.stdout/)
      }
    })

    it('L0 Kernel 不应使用 process.stdin', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      for (const file of kernelFiles) {
        const content = readFileSync(join(KERNEL_ROOT, file), 'utf-8')
        expect(content).not.toMatch(/process\.stdin/)
      }
    })
  })

  describe('L1 OXL 不应导入 L2/L3 模块', () => {
    it('L1 OXL 不应导入 builtin 模块', () => {
      const dslFiles = glob
        .sync('**/*.ts', { cwd: OXL_ROOT })
        .filter((f) => !f.includes('/__tests__/') && !f.endsWith('.test.ts'))
      const forbidden = ['builtin']
      for (const file of dslFiles) {
        const content = readFileSync(join(OXL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L1 OXL 不应导入 work 模块', () => {
      const dslFiles = glob
        .sync('**/*.ts', { cwd: OXL_ROOT })
        .filter((f) => !f.includes('/__tests__/') && !f.endsWith('.test.ts'))
      const forbidden = ['work']
      for (const file of dslFiles) {
        const content = readFileSync(join(OXL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L1 OXL 不应导入 cli 模块', () => {
      const dslFiles = glob
        .sync('**/*.ts', { cwd: OXL_ROOT })
        .filter((f) => !f.includes('/__tests__/') && !f.endsWith('.test.ts'))
      const forbidden = ['cli']
      for (const file of dslFiles) {
        const content = readFileSync(join(OXL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L1 OXL 不应导入 daemon/hall/skills/watcher/core/i18n 模块', () => {
      const dslFiles = glob
        .sync('**/*.ts', { cwd: OXL_ROOT })
        .filter((f) => !f.includes('/__tests__/') && !f.endsWith('.test.ts'))
      const forbidden = ['daemon', 'hall', 'skills', 'watcher', 'core', 'i18n']
      for (const file of dslFiles) {
        const content = readFileSync(join(OXL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })
  })
})
