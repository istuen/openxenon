import { describe, it, expect } from 'bun:test'
import {
  PartDefinitionSchema,
  PartInvocationSchema
} from '../../../src/kernel/schemas/part'

describe('PartDefinitionSchema', () => {
  describe('合法 Definition 通过校验', () => {
    it('合法 Part Definition 通过校验', () => {
      const input = {
        id: 'build-part',
        name: '构建',
        description: '执行构建'
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 deps 的 Part Definition 通过校验', () => {
      const input = {
        id: 'test-part',
        name: '测试',
        description: '执行测试',
        deps: ['build-part']
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 probes 的 Part Definition 通过校验', () => {
      const input = {
        id: 'test-part',
        name: '测试',
        description: '执行测试',
        probes: [
          { type: 'fs_exists', params: { pattern: 'dist/**' } }
        ]
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Definition', () => {
    it('缺少 description 时抛出异常', () => {
      const input = {
        id: 'build-part',
        name: '构建'
      }
      expect(() => PartDefinitionSchema.parse(input)).toThrow()
    })
  })
})

describe('PartInvocationSchema', () => {
  describe('合法 Invocation 通过校验', () => {
    it('合法 Part Invocation 通过校验', () => {
      const input = {
        id: 'build',
        name: '构建'
      }
      expect(() => PartInvocationSchema.parse(input)).not.toThrow()
    })

    it('带 ref 的 Part Invocation 通过校验', () => {
      const input = {
        id: 'install',
        ref: 'oxn/parts/install-deps'
      }
      expect(() => PartInvocationSchema.parse(input)).not.toThrow()
    })

    it('带 probes_append 的 Part Invocation 通过校验', () => {
      const input = {
        id: 'test',
        ref: 'oxn/parts/run-tests',
        probes_append: [
          { type: 'fs_exists', params: { pattern: 'coverage/**' } }
        ]
      }
      expect(() => PartInvocationSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Invocation', () => {
    it('缺少 id 时抛出异常', () => {
      const input = {
        name: '构建'
      }
      expect(() => PartInvocationSchema.parse(input)).toThrow()
    })
  })
})