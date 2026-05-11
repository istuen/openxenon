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
        description: '执行构建',
        proof: 'build-proof'
      }
      expect(() => StageDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 deps 的 Stage Definition 通过校验', () => {
      const input = {
        id: 'test-stage',
        name: '测试',
        description: '执行测试',
        proof: 'test-proof',
        deps: ['build-stage']
      }
      expect(() => StageDefinitionSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Definition', () => {
    it('缺少 description 时抛出异常', () => {
      const input = {
        id: 'build-stage',
        name: '构建',
        proof: 'build-proof'
      }
      expect(() => StageDefinitionSchema.parse(input)).toThrow()
    })

    it('缺少 proof 时抛出异常', () => {
      const input = {
        id: 'build-stage',
        name: '构建',
        description: '执行构建'
      }
      expect(() => StageDefinitionSchema.parse(input)).toThrow()
    })

    it('使用 Invocation 格式时抛出异常', () => {
      const invocationInput = {
        name: 'build',
        proof: 'build-proof'
      }
      expect(() => StageDefinitionSchema.parse(invocationInput)).toThrow()
    })
  })
})

describe('StageInvocationSchema', () => {
  describe('合法 Invocation 通过校验', () => {
    it('合法 Stage Invocation 通过校验', () => {
      const input = {
        name: 'build',
        proof: 'build-proof'
      }
      expect(() => StageInvocationSchema.parse(input)).not.toThrow()
    })

    it('带 description 和 deps 的 Stage Invocation 通过校验', () => {
      const input = {
        name: 'build',
        description: '构建阶段',
        proof: 'build-proof',
        deps: ['setup-stage']
      }
      expect(() => StageInvocationSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Invocation', () => {
    it('使用 Definition 格式时抛出异常', () => {
      const definitionInput = {
        id: 'build-stage',
        name: '构建',
        description: '执行构建',
        proof: 'build-proof'
      }
      expect(() => StageInvocationSchema.parse(definitionInput)).toThrow()
    })

    it('缺少 name 时抛出异常', () => {
      const input = {
        proof: 'build-proof'
      }
      expect(() => StageInvocationSchema.parse(input)).toThrow()
    })
  })
})

describe('Definition 和 Invocation 格式互斥', () => {
  it('StageDefinitionSchema 拒绝 Invocation 格式', () => {
    const invocationInput = {
      name: 'build',
      proof: 'build-proof'
    }
    expect(() => StageDefinitionSchema.parse(invocationInput)).toThrow()
  })

  it('StageInvocationSchema 拒绝 Definition 格式', () => {
    const definitionInput = {
      id: 'build-stage',
      name: '构建',
      description: '执行构建',
      proof: 'build-proof'
    }
    expect(() => StageInvocationSchema.parse(definitionInput)).toThrow()
  })
})