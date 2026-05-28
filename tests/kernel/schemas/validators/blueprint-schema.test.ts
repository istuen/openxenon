import { describe, expect, it } from 'bun:test'
import {
  BlueprintSchema,
  parseBlueprint,
  safeParseBlueprint,
  SlotInvocationSchema,
  extractTemplateVariables,
  validatePartTemplates,
  ALLOWED_VARIABLE_SCOPES,
} from '../../../../src/kernel/schemas/validators/blueprint.schema'

describe('BlueprintSchema', () => {
  describe('合法 Blueprint 通过校验', () => {
    it('最小合法 Blueprint 通过校验', () => {
      const input = {
        id: 'test-blueprint',
        name: '测试 Blueprint',
      }
      expect(() => BlueprintSchema.parse(input)).not.toThrow()
    })

    it('带 parts 的 Blueprint 通过校验', () => {
      const input = {
        id: 'test-blueprint',
        name: '测试 Blueprint',
        parts: [{ id: 'part1' }, { id: 'part2' }],
      }
      expect(() => BlueprintSchema.parse(input)).not.toThrow()
    })

    it('带 topology 的 Blueprint 通过校验', () => {
      const input = {
        id: 'test-blueprint',
        name: '测试 Blueprint',
        topology: ['A', 'B', 'C'],
      }
      expect(() => BlueprintSchema.parse(input)).not.toThrow()
    })

    it('带 edges 的 Blueprint 通过校验', () => {
      const input = {
        id: 'test-blueprint',
        name: '测试 Blueprint',
        edges: [{ from: 'A', to: 'B' }],
      }
      expect(() => BlueprintSchema.parse(input)).not.toThrow()
    })
  })

  describe('拒绝非法 Blueprint', () => {
    it('缺少 id 时抛出异常', () => {
      const input = {
        name: '测试 Blueprint',
      }
      expect(() => BlueprintSchema.parse(input)).toThrow()
    })

    it('缺少 name 时抛出异常', () => {
      const input = {
        id: 'test-blueprint',
      }
      expect(() => BlueprintSchema.parse(input)).toThrow()
    })
  })
})

describe('parseBlueprint', () => {
  it('合法数据返回 Blueprint 对象', () => {
    const input = { id: 'test', name: 'Test' }
    const result = parseBlueprint(input)
    expect(result.id).toBe('test')
    expect(result.name).toBe('Test')
  })

  it('非法数据抛出 ZodError', () => {
    const input = { name: 'Test' }
    expect(() => parseBlueprint(input)).toThrow()
  })
})

describe('safeParseBlueprint', () => {
  it('合法数据返回 success:true', () => {
    const input = { id: 'test', name: 'Test' }
    const result = safeParseBlueprint(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('test')
    }
  })

  it('非法数据返回 success:false', () => {
    const input = { name: 'Test' }
    const result = safeParseBlueprint(input)
    expect(result.success).toBe(false)
  })
})

describe('SlotInvocationSchema transform', () => {
  it('字符串 slot 自动转为 { name, inline: false }', () => {
    const result = SlotInvocationSchema.parse('jest-runner')
    expect(result).toEqual({ name: 'jest-runner', inline: false })
  })

  it('对象 slot 的 inline 默认为 false', () => {
    const result = SlotInvocationSchema.parse({ name: 'custom-part' })
    expect(result).toEqual({ name: 'custom-part', inline: false })
  })

  it('对象 slot 显式设置 inline: true 时保留', () => {
    const result = SlotInvocationSchema.parse({ name: 'inline-part', inline: true })
    expect(result).toEqual({ name: 'inline-part', inline: true })
  })
})

describe('extractTemplateVariables', () => {
  it('提取 {{params.xxx}}', () => {
    const action = { instruction: 'echo {{params.output}}' }
    const result = extractTemplateVariables(action)
    expect(result).toContain('params.output')
  })

  it('提取 {{task.xxx}}', () => {
    const action = { instruction: 'task id: {{task.id}}' }
    const result = extractTemplateVariables(action)
    expect(result).toContain('task.id')
  })

  it('提取 {{part.xxx}}', () => {
    const action = { command: 'run {{part.name}}' }
    const result = extractTemplateVariables(action)
    expect(result).toContain('part.name')
  })

  it('无模板变量返回空数组', () => {
    const action = { instruction: 'simple command' }
    const result = extractTemplateVariables(action)
    expect(result).toEqual([])
  })

  it('undefined action 返回空数组', () => {
    const result = extractTemplateVariables(undefined)
    expect(result).toEqual([])
  })
})

describe('ALLOWED_VARIABLE_SCOPES', () => {
  it('只允许 params, task, part', () => {
    expect(ALLOWED_VARIABLE_SCOPES).toEqual(['params', 'task', 'part'])
  })
})

describe('validatePartTemplates (@deprecated)', () => {
  it('合法的 params/task/part 变量通过', () => {
    const part = {
      id: 'test',
      action: { instruction: 'echo {{params.output}}' },
    }
    const result = validatePartTemplates(part)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('env.* 变量被拒绝', () => {
    const part = {
      id: 'test',
      action: { instruction: 'echo {{env.API_KEY}}' },
    }
    const result = validatePartTemplates(part)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('action 模板禁止使用 env.* 变量')
  })

  it('未知 scope 被拒绝', () => {
    const part = {
      id: 'test',
      action: { instruction: 'echo {{unknown.var}}' },
    }
    const result = validatePartTemplates(part)
    expect(result.valid).toBe(false)
  })
})
