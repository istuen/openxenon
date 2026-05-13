import { describe, it, expect } from 'bun:test'
import {
  ProofDefinitionSchema,
  ProofInvocationSchema
} from '../../../src/kernel/schemas/proof'

describe('ProofDefinitionSchema', () => {
  describe('合法 Definition 通过校验', () => {
    it('合法 Proof Definition 通过校验', () => {
      const input = {
        target: { description: '验证构建成功' },
        spec: { description: '构建必须成功' },
        probes: [{ ref: 'exec_exit_zero', description: '检查命令' }]
      }
      expect(() => ProofDefinitionSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Definition', () => {
    it('缺少 probes 数组时抛出异常', () => {
      const input = {
        target: { description: '测试' },
        spec: { description: '测试' }
      }
      expect(() => ProofDefinitionSchema.parse(input)).toThrow()
    })

    it('使用 Invocation 格式时抛出异常', () => {
      const invocationInput = {
        name: 'build-success',
        target: '构建成功'
      }
      expect(() => ProofDefinitionSchema.parse(invocationInput)).toThrow()
    })

    it('缺少 target.description 时抛出异常', () => {
      const input = {
        target: {},
        spec: { description: '测试' },
        probes: [{ ref: 'exec_exit_zero', description: '检查' }]
      }
      expect(() => ProofDefinitionSchema.parse(input)).toThrow()
    })
  })
})

describe('ProofInvocationSchema', () => {
  describe('合法 Invocation 通过校验', () => {
    it('合法 Proof Invocation 通过校验（无 probeRefs）', () => {
      const input = {
        name: 'build-success',
        target: '构建成功'
      }
      expect(() => ProofInvocationSchema.parse(input)).not.toThrow()
    })

it('合法 Proof Invocation 通过校验（带内联 ProbeInvocation）', () => {
      const input = {
        name: 'build-success',
        target: '构建成功',
        probeRefs: [{ type: 'fs_exists', params: { pattern: '/foo/bar' } }]
      }
      expect(() => ProofInvocationSchema.parse(input)).not.toThrow()
    })

    it('合法 Proof Invocation 通过校验（带多个内联 ProbeInvocation）', () => {
      const input = {
        name: 'build-success',
        target: '构建成功',
        probeRefs: [
          { type: 'fs_exists', params: { pattern: '/foo' } },
          { type: 'shell_exec', params: { command: 'npm test' } }
        ]
      }
      expect(() => ProofInvocationSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Invocation', () => {
    it('probeRefs 为 string 时抛出异常（旧格式）', () => {
      const input = {
        name: 'build-success',
        target: '构建成功',
        probeRefs: ['exec_exit_zero', 'fs_exists']
      }
      expect(() => ProofInvocationSchema.parse(input)).toThrow()
    })

    it('probeRefs 包含 Definition 格式时抛出异常', () => {
      const input = {
        name: 'build',
        target: '构建',
        probeRefs: [{ type: 'fs_exists', description: '检查', parameters: [] }]
      }
      expect(() => ProofInvocationSchema.parse(input)).toThrow()
    })

    it('使用 Definition 格式时抛出异常', () => {
      const definitionInput = {
        target: { description: '验证构建成功' },
        spec: { description: '构建必须成功' },
        probes: [{ ref: 'exec_exit_zero', description: '检查命令' }]
      }
      expect(() => ProofInvocationSchema.parse(definitionInput)).toThrow()
    })

    it('缺少 name 时抛出异常', () => {
      const input = {
        target: '构建成功'
      }
      expect(() => ProofInvocationSchema.parse(input)).toThrow()
    })
  })
})

describe('Definition 和 Invocation 格式互斥', () => {
  it('ProofDefinitionSchema 拒绝 Invocation 格式', () => {
    const invocationInput = {
      name: 'build-success',
      target: '构建成功'
    }
    expect(() => ProofDefinitionSchema.parse(invocationInput)).toThrow()
  })

  it('ProofInvocationSchema 拒绝 Definition 格式', () => {
    const definitionInput = {
      target: { description: '验证构建成功' },
      spec: { description: '构建必须成功' },
      probes: [{ ref: 'exec_exit_zero', description: '检查命令' }]
    }
    expect(() => ProofInvocationSchema.parse(definitionInput)).toThrow()
  })
})