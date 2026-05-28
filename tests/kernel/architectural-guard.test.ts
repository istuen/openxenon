import { describe, expect, it } from 'bun:test'
import { glob } from 'glob'
import { readFileSync } from 'fs'
import { join } from 'path'

const KERNEL_ROOT = join(import.meta.dir, '../../src/kernel')
const OXN_DSL_ROOT = join(import.meta.dir, '../../src/oxn-dsl')

describe('Kernel Architectural Guard', () => {
  describe('L0 Kernel 不应导入 L1/L2/L3 模块', () => {
    it('L0 Kernel 不应导入 oxn-dsl 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['oxn-dsl']
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

    it('L0 Kernel 不应导入 arsenals 模块', () => {
      const kernelFiles = glob.sync('**/*.ts', { cwd: KERNEL_ROOT })
      const forbidden = ['arsenals']
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
      const forbidden = ['oxn-dsl', 'infra', 'arsenals', 'work', 'cli']
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

  describe('L1 OXN DSL 不应导入 L2/L3 模块', () => {
    it('L1 OXN DSL 不应导入 arsenals 模块', () => {
      const dslFiles = glob
        .sync('**/*.ts', { cwd: OXN_DSL_ROOT })
        .filter((f) => !f.includes('/__tests__/') && !f.endsWith('.test.ts'))
      const forbidden = ['arsenals']
      for (const file of dslFiles) {
        const content = readFileSync(join(OXN_DSL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L1 OXN DSL 不应导入 work 模块', () => {
      const dslFiles = glob
        .sync('**/*.ts', { cwd: OXN_DSL_ROOT })
        .filter((f) => !f.includes('/__tests__/') && !f.endsWith('.test.ts'))
      const forbidden = ['work']
      for (const file of dslFiles) {
        const content = readFileSync(join(OXN_DSL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })

    it('L1 OXN DSL 不应导入 cli 模块', () => {
      const dslFiles = glob
        .sync('**/*.ts', { cwd: OXN_DSL_ROOT })
        .filter((f) => !f.includes('/__tests__/') && !f.endsWith('.test.ts'))
      const forbidden = ['cli']
      for (const file of dslFiles) {
        const content = readFileSync(join(OXN_DSL_ROOT, file), 'utf-8')
        for (const mod of forbidden) {
          expect(content).not.toMatch(new RegExp(`from ['"]${mod}(\\/|['"])`))
          expect(content).not.toMatch(new RegExp(`require\\(['"]${mod}(\\/|['"])`))
        }
      }
    })
  })
})
