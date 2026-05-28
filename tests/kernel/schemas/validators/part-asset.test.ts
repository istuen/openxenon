import { describe, expect, it } from 'bun:test'
import { PartDefinitionSchema, validatePartAsset } from '../../../../src/kernel/schemas/validators/part-asset'

describe('PartDefinitionSchema', () => {
  describe('合法 Definition 通过校验', () => {
    it('合法 Part Definition 通过校验', () => {
      const input = {
        id: 'build-part',
        name: '构建',
        description: '执行构建',
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 props 的 Part Definition 通过校验', () => {
      const input = {
        id: 'build-part',
        name: '构建',
        description: '执行构建',
        props: {
          type: 'object',
          properties: { output: { type: 'string' } },
          required: ['output'],
        },
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 probes 的 Part Definition 通过校验', () => {
      const input = {
        id: 'build-part',
        name: '构建',
        description: '执行构建',
        probes: [{ type: 'fs_exists', params: { pattern: 'dist/**' } }],
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
    })

    it('带 semantics 的 Part Definition 通过校验', () => {
      const input = {
        id: 'build-part',
        name: '构建',
        description: '执行构建',
        semantics: { intent: '执行构建任务', tags: ['build'] },
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Definition', () => {
    it('缺少 description 时抛出异常', () => {
      const input = {
        id: 'build-part',
        name: '构建',
      }
      expect(() => PartDefinitionSchema.parse(input)).toThrow()
    })

    it('缺少 id 时抛出异常', () => {
      const input = {
        name: '构建',
        description: '执行构建',
      }
      expect(() => PartDefinitionSchema.parse(input)).toThrow()
    })
  })

  describe('默认值测试', () => {
    it('_version 默认为 1', () => {
      const input = {
        id: 'test-part',
        name: '测试',
        description: '执行测试',
      }
      const result = PartDefinitionSchema.parse(input)
      expect(result._version).toBe(1)
    })
  })

  describe('可选字段测试', () => {
    it('_forked_from 为可选字段', () => {
      const input = {
        id: 'forked-part',
        name: 'Forked',
        description: 'Forked part',
        _forked_from: 'original-part',
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
      const result = PartDefinitionSchema.parse(input)
      expect(result._forked_from).toBe('original-part')
    })

    it('_extracted_from 为可选字段', () => {
      const input = {
        id: 'extracted-part',
        name: 'Extracted',
        description: 'Extracted part',
        _extracted_from: 'source-part',
      }
      expect(() => PartDefinitionSchema.parse(input)).not.toThrow()
      const result = PartDefinitionSchema.parse(input)
      expect(result._extracted_from).toBe('source-part')
    })
  })
})

describe('validatePartAsset', () => {
  it('合法数据返回 PartDefinition 对象', () => {
    const input = {
      id: 'test-part',
      name: '测试',
      description: '执行测试',
    }
    const result = validatePartAsset(input)
    expect(result.id).toBe('test-part')
    expect(result._version).toBe(1)
  })

  it('非法数据抛出 ZodError', () => {
    const input = {
      name: '测试',
    }
    expect(() => validatePartAsset(input)).toThrow()
  })
})
