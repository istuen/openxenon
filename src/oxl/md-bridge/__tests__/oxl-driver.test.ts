/**
 * OxlDriver 抽象测试
 *
 * 验证：
 * - LangiumOxlDriver 可解析 .oxn 内容
 * - MdastOxlDriver 可解析 .md 内容
 * - driverRegistry 可注册/选择/切换
 * - getActiveDriver / setActiveDriver 工作正常
 */

import { describe, expect, test, beforeEach } from 'bun:test'
import { driverRegistry, getActiveDriver, setActiveDriver, MdastOxlDriver } from '../index'
import { LangiumOxlDriver } from '../../langium-driver/langium-oxl-driver'

describe('OxlDriver 抽象', () => {
  beforeEach(() => {
    // 每次测试前重置为 langium
    setActiveDriver('langium')
  })

  test('driverRegistry 默认注册 langium + mdast', () => {
    const drivers = driverRegistry.list()
    expect(drivers).toContain('langium')
    expect(drivers).toContain('mdast')
  })

  test('getActiveDriver 默认 langium', () => {
    const driver = getActiveDriver()
    expect(driver.name).toBe('langium')
  })

  test('setActiveDriver 切换到 mdast', () => {
    setActiveDriver('mdast')
    expect(driverRegistry.getDefaultName()).toBe('mdast')
    expect(getActiveDriver().name).toBe('mdast')
  })

  test('LangiumOxlDriver parse 基础 .oxn', async () => {
    const driver = new LangiumOxlDriver()
    const content = `probe "test-probe" {
  description = "test"
  prop "input" { type = string; required = true }
}`
    const doc = await driver.parse(content, {
      assetType: 'probe',
      filePath: '/tmp/test.oxn',
    })

    expect(doc.driver).toBe('langium')
    expect(doc.content).toBe(content)
    expect(doc.parseErrors).toBeArray()
    expect(doc.lexerErrors).toBeArray()
    expect(doc.meta.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(doc.meta.entityType).toBe('probe')
  })

  test('MdastOxlDriver parse 基础 .md', async () => {
    const driver = new MdastOxlDriver()
    const content = '# Domain: TestDomain\n\n> 业务规则'
    const doc = await driver.parse(content, {
      assetType: 'interface',
      filePath: '/tmp/test.md',
    })

    expect(doc.driver).toBe('mdast')
    expect(doc.content).toBe(content)
    expect(doc.parseErrors).toBeArray()
    expect(doc.lexerErrors).toBeArray()
    expect(doc.meta.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(doc.meta.entityType).toBe('interface')
  })

  test('MdastOxlDriver 解析 .md 后产生 root mdast', async () => {
    const driver = new MdastOxlDriver()
    const doc = await driver.parse('# Test\n\ncontent')
    const ast = doc.ast as { type: string; children: unknown[] }
    expect(ast.type).toBe('root')
    expect(ast.children.length).toBeGreaterThan(0)
  })

  test('LangiumOxlDriver metadata 正确', () => {
    const driver = new LangiumOxlDriver()
    const meta = driver.getMetadata()
    expect(meta.name).toBe('langium')
    expect(meta.fileExtensions).toContain('.oxn')
    expect(meta.parserVersion).toContain('langium')
  })

  test('MdastOxlDriver metadata 正确', () => {
    const driver = new MdastOxlDriver()
    const meta = driver.getMetadata()
    expect(meta.name).toBe('mdast')
    expect(meta.fileExtensions).toContain('.md')
  })

  test('reset 不抛错', () => {
    const langium = new LangiumOxlDriver()
    const mdast = new MdastOxlDriver()
    expect(() => langium.reset()).not.toThrow()
    expect(() => mdast.reset()).not.toThrow()
  })

  test('setActiveDriver 未知名称抛错', () => {
    expect(() => {
      // @ts-expect-error - 测试运行时校验
      setActiveDriver('unknown-driver')
    }).toThrow()
  })
})
