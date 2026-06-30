import { describe, expect, it } from 'bun:test'
import {
  createXenonMeta,
  computeContentHash,
  validateFrozenBlueprint,
} from '@openxenon/engine/kernel/schemas/validators/frozen-schema'
import type { HashPort } from '@openxenon/engine/kernel/contracts/hash-port'

const mockHashPort: HashPort = {
  computeHash: (content: string) => `mock_hash_${content.slice(0, 10)}`,
}

describe('computeContentHash', () => {
  it('使用 hashPort 计算哈希', () => {
    const result = computeContentHash('test content', mockHashPort)
    expect(result).toBe('mock_hash_test conte')
  })

  it('相同内容返回相同哈希', () => {
    const hash1 = computeContentHash('test', mockHashPort)
    const hash2 = computeContentHash('test', mockHashPort)
    expect(hash1).toBe(hash2)
  })

  it('不同内容返回不同哈希', () => {
    const hash1 = computeContentHash('content1', mockHashPort)
    const hash2 = computeContentHash('content2', mockHashPort)
    expect(hash1).not.toBe(hash2)
  })

  it('空字符串返回哈希', () => {
    const result = computeContentHash('', mockHashPort)
    expect(result).toBe('mock_hash_')
  })
})

describe('createXenonMeta', () => {
  it('创建包含所有字段的 XenonMeta 对象', () => {
    const result = createXenonMeta({
      ref: 'test-ref',
      resolvedFrom: 'project',
      content: '{"test": true}',
      hashPort: mockHashPort,
    })
    expect(result.ref).toBe('test-ref')
    expect(result.resolved_from).toBe('project')
    expect(result.frozen_at).toBeTruthy()
    expect(result.content_hash).toBeTruthy()
  })

  it('frozen_at 为 ISO 格式时间戳', () => {
    const result = createXenonMeta({
      ref: 'test',
      resolvedFrom: 'kernel',
      content: 'test',
      hashPort: mockHashPort,
    })
    expect(result.frozen_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('content_hash 由 computeContentHash 生成', () => {
    const result = createXenonMeta({
      ref: 'test',
      resolvedFrom: 'project',
      content: 'test',
      hashPort: mockHashPort,
    })
    expect(result.content_hash).toBe(mockHashPort.computeHash('test'))
  })

  it('optionalPath 未提供时 original_path 为 undefined', () => {
    const result = createXenonMeta({
      ref: 'test',
      resolvedFrom: 'global',
      content: 'test',
      hashPort: mockHashPort,
    })
    expect(result.original_path).toBeUndefined()
  })

  it('提供 originalPath 时被设置', () => {
    const result = createXenonMeta({
      ref: 'test',
      resolvedFrom: 'project',
      originalPath: '/path/to/original',
      content: 'test',
      hashPort: mockHashPort,
    })
    expect(result.original_path).toBe('/path/to/original')
  })
})

describe('validateFrozenBlueprint', () => {
  it('合法 frozen blueprint 通过校验', () => {
    const input = {
      id: 'test',
      name: 'Test Blueprint',
      frozen_at: '2024-01-01T00:00:00.000Z',
      parts: [
        {
          _xenon_meta: {
            ref: 'test-ref',
            resolved_from: 'project',
            frozen_at: '2024-01-01T00:00:00.000Z',
            content_hash: 'abc123',
          },
          id: 'part1',
          name: 'Part 1',
          probes: [],
        },
      ],
    }
    expect(() => validateFrozenBlueprint(input)).not.toThrow()
  })

  it('缺少 _xenon_meta 时抛出异常', () => {
    const input = {
      id: 'test',
      name: 'Test Blueprint',
      frozen_at: '2024-01-01T00:00:00.000Z',
      parts: [
        {
          id: 'part1',
          name: 'Part 1',
        },
      ],
    }
    expect(() => validateFrozenBlueprint(input)).toThrow()
  })
})
