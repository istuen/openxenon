import { describe, expect, it } from 'bun:test'
import { countVerbosity } from '../commands/context'

describe('countVerbosity (v1.1 fix-p2-robustness vv-arg-parsing)', () => {
  it('空 argv → 0', () => {
    expect(countVerbosity([])).toBe(0)
  })

  it('argv 含 -v → +1', () => {
    expect(countVerbosity(['oxn', 'work', 'list', '-v'])).toBe(1)
  })

  it('argv 含 -vv → +2', () => {
    expect(countVerbosity(['oxn', '-vv'])).toBe(2)
  })

  it('argv 含 -v -v (拆为两个 token) → +2', () => {
    expect(countVerbosity(['oxn', '-v', '-v'])).toBe(2)
  })

  it('argv 含 -v -vv 混合 → +3', () => {
    expect(countVerbosity(['oxn', '-v', '-vv'])).toBe(3)
  })

  it('argv 含 --verbose → +1', () => {
    expect(countVerbosity(['oxn', '--verbose'])).toBe(1)
  })

  it('argv 含 -vvv → +3', () => {
    expect(countVerbosity(['oxn', '-vvv'])).toBe(3)
  })

  it('argv 含 -vvvv → +4 (长形态)', () => {
    expect(countVerbosity(['oxn', '-vvvv'])).toBe(4)
  })

  it('argv 含 --json 不会被误判为 v', () => {
    expect(countVerbosity(['oxn', 'work', 'list', '--json'])).toBe(0)
  })

  it('argv 含 --version 不会被误判为 v', () => {
    expect(countVerbosity(['oxn', '--version'])).toBe(0)
  })

  it('argv 含 --yaml 不会被误判为 v (注意: --yaml 不匹配 /^-+v+$/)', () => {
    expect(countVerbosity(['oxn', '--yaml'])).toBe(0)
  })

  it('argv 含 2 个 -vv → +4 (累加)', () => {
    expect(countVerbosity(['oxn', '-vv', '-vv'])).toBe(4)
  })

  it('argv 含混合: -v -v -vv → +4', () => {
    expect(countVerbosity(['oxn', '-v', '-v', '-vv'])).toBe(4)
  })
})
