import { describe, expect, test } from 'bun:test'
import { detectPipeline } from '../../cli/oxn-dual-track'

describe('detectPipeline', () => {
  test('.oxn 文件路由到新管线', () => {
    expect(detectPipeline('task.oxn')).toBe('oxn')
    expect(detectPipeline('/path/to/blueprint.oxn')).toBe('oxn')
  })

  test('.yaml 文件路由到老管线', () => {
    expect(detectPipeline('blueprint.yaml')).toBe('yaml')
    expect(detectPipeline('blueprint.yml')).toBe('yaml')
  })

  test('.json 文件路由到老管线', () => {
    expect(detectPipeline('data.json')).toBe('yaml')
  })

  test('无后缀文件路由到老管线', () => {
    expect(detectPipeline('blueprint')).toBe('yaml')
  })
})

// ========================
// YAML → OXN 迁移测试
// ========================

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { formatMigrationReport, type MigrationStats, migrateSingleFile } from '../../cli/migrate-yaml'

describe('migrateSingleFile', () => {
  const tmpDir = '/tmp/oxn-migrate-test'

  test('stage 无 slot 的 Blueprint 迁移', () => {
    const yamlPath = join(tmpDir, 'test-migrate.yaml')
    writeFileSync(
      yamlPath,
      `
name: simple-check
stages:
  - id: check-readme
    name: 检查 README
    target:
      description: README.md 存在
    probes:
      - type: fs_exists
        params:
          pattern: "README.md"
`,
      'utf-8',
    )

    const result = migrateSingleFile(yamlPath)
    expect(result.success).toBe(1)
    expect(result.failures).toBe(0)

    const oxnPath = yamlPath.replace('.yaml', '.oxn')
    expect(existsSync(oxnPath)).toBe(true)

    const content = readFileSync(oxnPath, 'utf-8')
    expect(content).toContain('blueprint "simple-check"')
    expect(content).toContain('stage "check-readme"')
    expect(content).toContain('deps = []')

    // Cleanup
    unlinkSync(yamlPath)
    unlinkSync(oxnPath)
  })

  test('blueprint 含 slots → abstract part 翻译', () => {
    const yamlPath = join(tmpDir, 'test-slots.yaml')
    writeFileSync(
      yamlPath,
      `
name: ci-pipeline
slots:
  tester: test-runner
stages:
  - id: run-test
    name: 运行测试
    slot: tester
    probes:
      - type: exec_exit_zero
        params:
          command: "npm test"
`,
      'utf-8',
    )

    const result = migrateSingleFile(yamlPath)
    expect(result.success).toBe(1)

    const oxnPath = yamlPath.replace('.yaml', '.oxn')
    const content = readFileSync(oxnPath, 'utf-8')
    expect(content).toContain('abstract part "tester"')
    expect(content).toContain('stage "run-test"')

    unlinkSync(yamlPath)
    unlinkSync(oxnPath)
  })

  test('blueprint 含 props → prop 声明', () => {
    const yamlPath = join(tmpDir, 'test-props.yaml')
    writeFileSync(
      yamlPath,
      `
name: deploy
props:
  env:
    type: string
    required: true
  replicas:
    type: number
    default: 3
stages: []
`,
      'utf-8',
    )

    const result = migrateSingleFile(yamlPath)
    expect(result.success).toBe(1)

    const oxnPath = yamlPath.replace('.yaml', '.oxn')
    const content = readFileSync(oxnPath, 'utf-8')
    expect(content).toContain('prop "env"')
    expect(content).toContain('required = true')
    expect(content).toContain('prop "replicas"')
    expect(content).toContain('default = 3')

    unlinkSync(yamlPath)
    unlinkSync(oxnPath)
  })

  test('不存在的文件 → failure', () => {
    const result = migrateSingleFile('/tmp/nonexistent.yaml')
    expect(result.failures).toBe(1)
  })

  test('formatMigrationReport 格式化', () => {
    const stats: MigrationStats = {
      total: 3,
      success: 2,
      failures: 1,
      details: ['✅ a.yaml → a.oxn', '✅ b.yaml → b.oxn', '❌ c.yaml: parse error'],
    }
    const report = formatMigrationReport(stats)
    expect(report).toContain('总计: 3')
    expect(report).toContain('成功: 2')
    expect(report).toContain('失败: 1')
  })
})
