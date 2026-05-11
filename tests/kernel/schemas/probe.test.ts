import { describe, it, expect } from 'bun:test'
import {
  ProbeDefinitionSchema,
  ProbeInvocationSchema
} from '../../../src/kernel/schemas/probe'

describe('ProbeDefinitionSchema', () => {
  describe('合法 Definition 通过校验', () => {
    it('合法 fs_exists Definition 通过校验', () => {
      const input = {
        type: 'fs_exists',
        description: '检查文件存在',
        parameters: [{ name: 'path', type: 'string', description: '文件路径' }]
      }
      expect(() => ProbeDefinitionSchema.parse(input)).not.toThrow()
    })

    it('合法 fs_content_match Definition 通过校验', () => {
      const input = {
        type: 'fs_content_match',
        description: '检查文件内容',
        parameters: [
          { name: 'path', type: 'string', description: '文件路径' },
          { name: 'pattern', type: 'string', description: '正则模式' }
        ]
      }
      expect(() => ProbeDefinitionSchema.parse(input)).not.toThrow()
    })

    it('合法 exec_exit_zero Definition 通过校验', () => {
      const input = {
        type: 'exec_exit_zero',
        description: '检查命令成功',
        parameters: [{ name: 'command', type: 'string', description: '命令' }]
      }
      expect(() => ProbeDefinitionSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Definition', () => {
    it('缺少 description 时抛出异常', () => {
      const input = {
        type: 'fs_exists',
        parameters: [{ name: 'path', type: 'string', description: '路径' }]
      }
      expect(() => ProbeDefinitionSchema.parse(input)).toThrow()
    })

    it('缺少 parameters[x].description 时抛出异常', () => {
      const input = {
        type: 'fs_exists',
        description: '检查',
        parameters: [{ name: 'path', type: 'string' }]
      }
      expect(() => ProbeDefinitionSchema.parse(input)).toThrow()
    })

    it('使用 params 而非 parameters 时抛出异常（拒绝 Invocation 格式）', () => {
      const input = {
        type: 'fs_exists',
        params: { path: '/foo' }
      }
      expect(() => ProbeDefinitionSchema.parse(input)).toThrow()
    })

    it('未知 type 时抛出异常', () => {
      const input = {
        type: 'unknown_type',
        description: '测试',
        parameters: []
      }
      expect(() => ProbeDefinitionSchema.parse(input)).toThrow()
    })
  })
})

describe('ProbeInvocationSchema', () => {
  describe('合法 Invocation 通过校验', () => {
    it('合法 fs_exists Invocation 通过校验', () => {
      const input = {
        type: 'fs_exists',
        params: { path: '/foo/bar' }
      }
      expect(() => ProbeInvocationSchema.parse(input)).not.toThrow()
    })

    it('合法 fs_content_match Invocation 通过校验', () => {
      const input = {
        type: 'fs_content_match',
        params: { path: '/foo', pattern: '*.js' }
      }
      expect(() => ProbeInvocationSchema.parse(input)).not.toThrow()
    })

    it('合法 exec_exit_zero Invocation 通过校验', () => {
      const input = {
        type: 'exec_exit_zero',
        params: { command: 'npm test' }
      }
      expect(() => ProbeInvocationSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Invocation', () => {
    it('使用 parameters 而非 params 时抛出异常（拒绝 Definition 格式）', () => {
      const input = {
        type: 'fs_exists',
        description: '检查',
        parameters: [{ name: 'path', type: 'string', description: '路径' }]
      }
      expect(() => ProbeInvocationSchema.parse(input)).toThrow()
    })

    it('缺少 params.path 时抛出异常', () => {
      const input = {
        type: 'fs_exists',
        params: {}
      }
      expect(() => ProbeInvocationSchema.parse(input)).toThrow()
    })
  })
})

describe('Definition 和 Invocation 格式互斥', () => {
  it('DefinitionSchema 拒绝 Invocation 格式', () => {
    const invocationInput = {
      type: 'fs_exists',
      params: { path: '/foo/bar' }
    }
    expect(() => ProbeDefinitionSchema.parse(invocationInput)).toThrow()
  })

  it('InvocationSchema 拒绝 Definition 格式', () => {
    const definitionInput = {
      type: 'fs_exists',
      description: '检查文件存在',
      parameters: [{ name: 'path', type: 'string', description: '文件路径' }]
    }
    expect(() => ProbeInvocationSchema.parse(definitionInput)).toThrow()
  })
})