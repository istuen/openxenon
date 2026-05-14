import { describe, it, expect } from 'bun:test'
import {
  StageDefinitionSchema,
  StageInvocationSchema
} from '../../../src/kernel/schemas/stage'

describe('StageDefinitionSchema', () => {
  describe('合法 Definition 通过校验', () => {
    it('合法 Stage Definition 通过校验', () => {
      const input = {
        id: 'build-stage',
        name: '构建',
        description: '执行构建'
      }
      expect(() => StageDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 deps 的 Stage Definition 通过校验', () => {
      const input = {
        id: 'test-stage',
        name: '测试',
        description: '执行测试',
        deps: ['build-stage']
      }
      expect(() => StageDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 probes 的 Stage Definition 通过校验', () => {
      const input = {
        id: 'test-stage',
        name: '测试',
        description: '执行测试',
        probes: [
          { type: 'fs_exists', params: { pattern: 'dist/**' } }
        ]
      }
      expect(() => StageDefinitionSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Definition', () => {
    it('缺少 description 时抛出异常', () => {
      const input = {
        id: 'build-stage',
        name: '构建'
      }
      expect(() => StageDefinitionSchema.parse(input)).toThrow()
    })
  })
})

describe('StageInvocationSchema', () => {
  describe('合法 Invocation 通过校验', () => {
    it('合法 Stage Invocation 通过校验', () => {
      const input = {
        id: 'build',
        name: '构建'
      }
      expect(() => StageInvocationSchema.parse(input)).not.toThrow()
    })

    it('带 ref 的 Stage Invocation 通过校验', () => {
      const input = {
        id: 'install',
        ref: 'oxn/stages/install-deps'
      }
      expect(() => StageInvocationSchema.parse(input)).not.toThrow()
    })

    it('带 probes_append 的 Stage Invocation 通过校验', () => {
      const input = {
        id: 'test',
        ref: 'oxn/stages/run-tests',
        probes_append: [
          { type: 'fs_exists', params: { pattern: 'coverage/**' } }
        ]
      }
      expect(() => StageInvocationSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Invocation', () => {
    it('缺少 id 时抛出异常', () => {
      const input = {
        name: '构建'
      }
      expect(() => StageInvocationSchema.parse(input)).toThrow()
    })
  })
})