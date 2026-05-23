import { describe, expect, test } from 'bun:test'
import { validateOxnAssemblyIR } from '../../kernel/schemas/oxn-assembly.schema'

import type {
  BlueprintDeclaration,
  Description,
  ExecutionRef,
  ExpectationDeclaration,
  OutputField,
  OXNDocument,
  ParamPair,
  ParamsBlock,
  PartDeclaration,
  PartProbeDeclaration,
  ProbeDeclaration,
  PropDeclaration,
  RuleDeclaration,
  TaskDeclaration,
} from '../generated/ast'
import {
  categorizeEntities,
  convertBlueprintDeclaration,
  convertPartDeclaration,
  convertProbeDeclaration,
  convertTaskDeclaration,
  generateOxnAssembly,
} from '../generator/oxn-generator'

// ========================
// Mock AST factories
// ========================

function mDesc(value: string): Description {
  return { $type: 'Description', $containerProperty: '', $containerIndex: 0, value } as Description
}

function mProp(name: string, type: string, required: boolean = false, defaultValue?: unknown): PropDeclaration {
  return {
    $type: 'PropDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    type,
    required: required
      ? { $type: 'RequiredModifier', $containerProperty: '', $containerIndex: 0, value: true }
      : undefined,
    default:
      defaultValue !== undefined
        ? { $type: 'DefaultValue', $containerProperty: '', $containerIndex: 0, value: defaultValue }
        : undefined,
  } as PropDeclaration
}

function mPartProbe(name: string, ref?: string, params?: Record<string, unknown>): PartProbeDeclaration {
  return {
    $type: 'PartProbeDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    ref,
    params: params
      ? ({
          $type: 'ParamsBlock',
          $containerProperty: '',
          $containerIndex: 0,
          pairs: Object.entries(params).map(
            ([key, value]): ParamPair => ({
              $type: 'ParamPair',
              $containerProperty: '',
              $containerIndex: 0,
              key,
              value,
            }),
          ),
        } as ParamsBlock)
      : undefined,
  } as PartProbeDeclaration
}

function mExecRef(part: string, probe: string): ExecutionRef {
  return {
    $type: 'ExecutionRef',
    $containerProperty: '',
    $containerIndex: 0,
    part,
    probe,
  } as ExecutionRef
}

// ========================
// 测试 Suite
// ========================

describe('convertProbeDeclaration', () => {
  test('完整探针转换', () => {
    const probe: ProbeDeclaration = {
      $type: 'ProbeDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'fs-exists',
      descriptions: [mDesc('验证文件是否存在')],
      props: [mProp('path', 'string', true), mProp('recursive', 'boolean', false, false)],
      output: [
        {
          $type: 'ProbeOutputDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          fields: [
            {
              $type: 'OutputField',
              $containerProperty: '',
              $containerIndex: 0,
              name: 'exists',
              type: 'boolean',
            } as OutputField,
          ],
        },
      ],
    } as ProbeDeclaration

    const result = convertProbeDeclaration(probe)
    expect(result.name).toBe('fs-exists')
    expect(result.description).toBe('验证文件是否存在')
    expect(result.props).toHaveLength(2)
    expect(result.props[0].name).toBe('path')
    expect(result.props[0].required).toBe(true)
    expect(result.props[1].name).toBe('recursive')
    expect(result.props[1].default).toBe(false)
    expect(result.output).toEqual({ exists: 'boolean' })
  })
})

// convertInterfaceDeclaration — removed in v3.0 (Interface abolished)
// convertAbstractPartDeclaration — removed in v3.0 (AbstractPart abolished)

describe('convertPartDeclaration', () => {
  test('具象零件含 execution', () => {
    const part: PartDeclaration = {
      $type: 'PartDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'jest-runner',
      implements: { $refText: 'test-runner', ref: 'test-runner' } as any,
      descriptions: [mDesc('Jest 测试执行器')],
      props: [mProp('target_env', 'string', false, 'dev'), mProp('coverage_threshold', 'number', false, 80)],
      probes: [
        mPartProbe('run_tests', '@oxn/probe/shell-exec', {
          command: 'npm test -- --coverage=${prop.coverage_threshold}',
          timeout: 60000,
        }),
      ],
      refs: [mExecRef('probe', 'run_tests')],
    } as PartDeclaration

    const result = convertPartDeclaration(part)
    expect(result.name).toBe('jest-runner')
    expect(result.description).toBe('Jest 测试执行器')
    expect(result.props).toHaveLength(2)
    expect(result.probes).toHaveLength(1)
    expect(result.probes[0].ref).toBe('@oxn/probe/shell-exec')
    expect(result.execution).toEqual(['probe.run_tests'])
  })
})

describe('convertBlueprintDeclaration', () => {
  test('完整 Blueprint 转换 (含 slot, expectation, rule)', () => {
    const bp: BlueprintDeclaration = {
      $type: 'BlueprintDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'feature-pipeline',
      version: 1,
      descriptions: [],
      props: [mProp('env', 'enum("dev", "staging", "prod")', false, 'dev'), mProp('coverage', 'number', false, 80)],
      parts: [
        {
          $type: 'PartInBlueprint',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'jest-runner',
          ref: '@prj/parts/jest-runner',
          propBindings: [],
          deps: [],
        },
      ],
      partSlots: [
        {
          $type: 'PartSlotDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'lint',
          deps: ['jest-runner'],
        },
      ],
      expectations: [
        {
          $type: 'ExpectationDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'must_use_zod',
          probe_ref: '@oxn/probe/ts-uses-import',
          params: {
            $type: 'ParamsBlock',
            $containerProperty: '',
            $containerIndex: 0,
            pairs: [
              {
                $type: 'ParamPair',
                $containerProperty: '',
                $containerIndex: 0,
                key: 'file_pattern',
                value: 'src/api/**/*.ts',
              } as ParamPair,
              {
                $type: 'ParamPair',
                $containerProperty: '',
                $containerIndex: 0,
                key: 'module_name',
                value: 'zod',
              } as ParamPair,
            ],
          } as ParamsBlock,
          err_msg: 'API 层必须使用 Zod',
        } as ExpectationDeclaration,
      ],
      rules: [
        {
          $type: 'RuleDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'prod_requires_ha',
          condition: 'prop.env != prod || prop.ha_enabled == true',
          err_msg: '生产环境必须开启 HA',
        } as RuleDeclaration,
      ],
    } as BlueprintDeclaration

    const result = convertBlueprintDeclaration(bp)

    expect(result.id).toBe('feature-pipeline')
    expect(result._version).toBe(1)

    // Props
    expect(result.props).toHaveLength(2)
    expect(result.props[0].type).toContain('enum')

    // Parts (A class)
    expect(result.blueprintParts).toHaveLength(1)
    expect(result.blueprintParts[0].name).toBe('jest-runner')

    // Slots (B class)
    expect(result.slots).toHaveLength(1)
    expect(result.slots[0].name).toBe('lint')
    expect(result.slots[0].deps).toEqual(['jest-runner'])

    // Expectations
    expect(result.expectations).toHaveLength(1)
    expect(result.expectations[0].name).toBe('must_use_zod')
    expect(result.expectations[0].params.file_pattern).toBe('src/api/**/*.ts')

    // Rules
    expect(result.rules).toHaveLength(1)
    expect(result.rules[0].name).toBe('prod_requires_ha')

    // Validate against Zod schema
    expect(() => validateOxnAssemblyIR(result)).not.toThrow()
  })
})

describe('convertTaskDeclaration', () => {
  test('Task 绑定转换', () => {
    const task: TaskDeclaration = {
      $type: 'TaskDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'validate-feature-auth',
      use: '@prj/blueprint/feature-pipeline',
      slotBindings: [
        {
          $type: 'SlotBinding',
          $containerProperty: '',
          $containerIndex: 0,
          slot: 'tester',
          ref: '@glo/parts/jest-runner',
          props: [{ $type: 'SlotPropBinding', $containerProperty: '', $containerIndex: 0, name: 'env', value: 'prod' }],
        },
      ],
    } as TaskDeclaration

    const result = convertTaskDeclaration(task)
    expect(result.name).toBe('validate-feature-auth')
    expect(result.use).toBe('@prj/blueprint/feature-pipeline')
    expect(result.slotBindings).toHaveLength(1)
    expect(result.slotBindings[0].slot).toBe('tester')
    expect(result.slotBindings[0].ref).toBe('@glo/parts/jest-runner')
  })
})

// ========================
// 集成测试: 完整 Bundle 生成
// ========================

describe('generateOxnAssembly — 完整 Bundle', () => {
  test('多实体文档生成 Bundle', () => {
    const doc: OXNDocument = {
      $type: 'OXNDocument',
      entities: [
        {
          $type: 'ProbeDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'shell-exec',
          descriptions: [],
          props: [mProp('command', 'string', true)],
          output: [],
        } as ProbeDeclaration,
        {
          $type: 'PartDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'jest-runner',
          descriptions: [],
          props: [],
          probes: [],
          refs: [mExecRef('probe', 'run_tests')],
        } as PartDeclaration,
        {
          $type: 'BlueprintDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'ci-pipeline',
          descriptions: [],
          props: [],
          parts: [],
          partSlots: [],
          expectations: [],
          rules: [],
        } as BlueprintDeclaration,
        {
          $type: 'TaskDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'deploy-prod',
          use: '@prj/blueprint/ci-pipeline',
          slotBindings: [],
        } as TaskDeclaration,
      ],
    } as OXNDocument

    const bundle = generateOxnAssembly(doc)
    expect(bundle.entities).toHaveLength(4)

    const types = bundle.entities.map((e) => e.type)
    expect(types).toContain('probe')
    expect(types).toContain('part')
    expect(types).toContain('blueprint')
    expect(types).toContain('task')
  })
})

// ========================
// 集成测试: categorizeEntities
// ========================

describe('categorizeEntities', () => {
  test('正确分类所有实体类型', () => {
    const doc: OXNDocument = {
      $type: 'OXNDocument',
      entities: [
        {
          $type: 'ProbeDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'p1',
          descriptions: [],
          props: [],
          output: [],
        } as ProbeDeclaration,
        {
          $type: 'ProbeDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'p2',
          descriptions: [],
          props: [],
          output: [],
        } as ProbeDeclaration,
        {
          $type: 'PartDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'part1',
          descriptions: [],
          props: [],
          probes: [],
          refs: [],
        } as PartDeclaration,
        {
          $type: 'PartDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'part2',
          descriptions: [],
          props: [],
          probes: [],
          refs: [],
        } as PartDeclaration,
        {
          $type: 'BlueprintDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'bp1',
          descriptions: [],
          props: [],
          parts: [],
          partSlots: [],
          expectations: [],
          rules: [],
        } as BlueprintDeclaration,
        {
          $type: 'TaskDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 't1',
          use: '',
          slotBindings: [],
        } as TaskDeclaration,
      ],
    } as OXNDocument

    const result = categorizeEntities(doc)
    expect(result.probes).toHaveLength(2)
    expect(result.parts).toHaveLength(2)
    expect(result.blueprints).toHaveLength(1)
    expect(result.tasks).toHaveLength(1)
  })
})

// ========================
// Edge Cases
// ========================

describe('Edge Cases', () => {
  test('空 Blueprint 生成合法 IR', () => {
    const bp: BlueprintDeclaration = {
      $type: 'BlueprintDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'empty-bp',
      descriptions: [],
      props: [],
      parts: [],
      partSlots: [],
      expectations: [],
      rules: [],
    } as BlueprintDeclaration

    const result = convertBlueprintDeclaration(bp)
    expect(result.id).toBe('empty-bp')
    expect(result._version).toBe(1)
    expect(() => validateOxnAssemblyIR(result)).not.toThrow()
  })

  // 抽象零件测试 — removed in v3.0

  test('PartProbe 无 ref 和 params', () => {
    const part: PartDeclaration = {
      $type: 'PartDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'simple-part',
      descriptions: [],
      props: [],
      probes: [mPartProbe('simple_probe')],
      refs: [],
    } as PartDeclaration

    const result = convertPartDeclaration(part)
    expect(result.probes[0].name).toBe('simple_probe')
    expect(result.probes[0].ref).toBeUndefined()
    expect(result.probes[0].params).toEqual({})
  })
})
