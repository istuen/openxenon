import { describe, expect, test } from 'bun:test'
import { validateOxnAssemblyIR } from '../schemas/oxn-assembly.schema'

import type {
  BlueprintDeclaration,
  Description,
  ExpectationDeclaration,
  OXNDocument,
  PartDeclaration,
  ProbeDeclaration,
  PropDeclaration,
  RuleDeclaration,
  WorkDeclaration,
} from '../generated/ast'
import {
  categorizeEntities,
  convertBlueprintDeclaration,
  convertPartDeclaration,
  convertProbeDeclaration,
  convertWorkDeclaration,
  generateOxnAssembly,
} from '../generator/oxn-generator'

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

function mProbe(
  name: string,
  desc?: string,
  props?: PropDeclaration[],
  outputFields?: OutputField[],
): ProbeDeclaration {
  return {
    $type: 'ProbeDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    descriptions: desc ? [mDesc(desc)] : [],
    props: props || [],
    output: outputFields
      ? [{ $type: 'ProbeOutputDeclaration', $containerProperty: '', $containerIndex: 0, fields: outputFields }]
      : [],
  } as ProbeDeclaration
}

function mPart(
  name: string,
  desc?: string,
  props?: PropDeclaration[],
  probes?: PartProbeDeclaration[],
  execution?: ExecutionRef[],
): PartDeclaration {
  return {
    $type: 'PartDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    descriptions: desc ? [mDesc(desc)] : [],
    props: props || [],
    probes: probes || [],
    refs: execution || [],
  } as PartDeclaration
}

function mBP(
  name: string,
  props?: PropDeclaration[],
  partSlots?: { name: string; deps?: string[] }[],
  expectations?: ExpectationDeclaration[],
  rules?: RuleDeclaration[],
): BlueprintDeclaration {
  return {
    $type: 'BlueprintDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    descriptions: [],
    version: 1,
    props: props || [],
    parts: [],
    partSlots:
      partSlots?.map((s) => ({
        $type: 'PartSlotDeclaration',
        $containerProperty: '',
        $containerIndex: 0,
        name: s.name,
        deps: s.deps || [],
      })) || [],
    expectations: expectations || [],
    rules: rules || [],
  } as BlueprintDeclaration
}

// ========================
// convertWorkDeclaration
// ========================

describe('convertWorkDeclaration', () => {
  test('Work 绑定转换', () => {
    const work: WorkDeclaration = {
      $type: 'WorkDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'validate-feature-auth',
      type: 'task',
      ref: '@prj/blueprint/feature-pipeline',
      slotBindings: [
        {
          $type: 'SlotBinding',
          $containerProperty: '',
          $containerIndex: 0,
          align: 'tester',
          name: 'tester',
          ref: '@glo/parts/jest-runner',
          props: [{ $type: 'SlotPropBinding', $containerProperty: '', $containerIndex: 0, name: 'env', value: 'prod' }],
          probeBindings: [],
        },
      ],
    } as WorkDeclaration

    const result = convertWorkDeclaration(work)
    expect(result.name).toBe('validate-feature-auth')
    expect(result.use).toBe('@prj/blueprint/feature-pipeline')
    expect(result.slotBindings).toHaveLength(1)
    expect(result.slotBindings[0].slot).toBe('tester')
    expect(result.slotBindings[0].ref).toBe('@glo/parts/jest-runner')
  })

  test('Work 无 slotBindings', () => {
    const work: WorkDeclaration = {
      $type: 'WorkDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'simple-work',
      type: 'plan',
      ref: '@prj/blueprint/simple',
      slotBindings: [],
    } as WorkDeclaration

    const result = convertWorkDeclaration(work)
    expect(result.name).toBe('simple-work')
    expect(result.use).toBe('@prj/blueprint/simple')
    expect(result.slotBindings).toHaveLength(0)
  })

  test('Work 无 ref', () => {
    const work: WorkDeclaration = {
      $type: 'WorkDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'work-no-ref',
      type: 'flow',
      ref: '',
      slotBindings: [],
    } as WorkDeclaration

    const result = convertWorkDeclaration(work)
    expect(result.name).toBe('work-no-ref')
    expect(result.use).toBe('')
  })
})

// ========================
// 集成测试: 完整 Bundle 生成
// ========================

describe('generateOxnAssembly — Work 集成', () => {
  test('多实体文档生成 Bundle (含 Work)', () => {
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
          name: 'k8s-worker',
          descriptions: [],
          props: [],
          probes: [],
          refs: [],
        } as PartDeclaration,
        {
          $type: 'BlueprintDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'ci-pipeline',
          type: 'task',
          descriptions: [],
          props: [],
          parts: [],
          partSlots: [],
          expectations: [],
          rules: [],
        } as BlueprintDeclaration,
        {
          $type: 'WorkDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'deploy-prod',
          type: 'task',
          ref: '@prj/blueprint/ci-pipeline',
          slotBindings: [],
        } as WorkDeclaration,
      ],
    } as OXNDocument

    const bundle = generateOxnAssembly(doc)
    expect(bundle.entities).toHaveLength(4)

    const types = bundle.entities.map((e) => e.type)
    expect(types).toContain('probe')
    expect(types).toContain('part')
    expect(types).toContain('blueprint')
    expect(types).toContain('work')
  })
})

// ========================
// 集成测试: categorizeEntities
// ========================

describe('categorizeEntities (Work)', () => {
  test('正确分类所有实体类型包含 Work', () => {
    const doc: OXNDocument = {
      $type: 'OXNDocument',
      entities: [
        mProbe('probe-1'),
        mPart('part-1'),
        mBP('blueprint-1'),
        {
          $type: 'WorkDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'work-1',
          type: 'task',
          ref: '@prj/bp/bp1',
          slotBindings: [],
        } as WorkDeclaration,
      ],
    } as OXNDocument

    const result = categorizeEntities(doc)

    expect(result.probes).toHaveLength(1)
    expect(result.parts).toHaveLength(1)
    expect(result.blueprints).toHaveLength(1)
    expect(result.works).toHaveLength(1)

    expect(result.probes[0]!.name).toBe('probe-1')
    expect(result.parts[0]!.name).toBe('part-1')
    expect(result.blueprints[0]!.name).toBe('blueprint-1')
    expect(result.works[0]!.name).toBe('work-1')
  })

  test('只有 Work 的文档', () => {
    const doc: OXNDocument = {
      $type: 'OXNDocument',
      entities: [
        {
          $type: 'WorkDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'only-work',
          type: 'plan',
          ref: '@prj/bp/plan-bp',
          slotBindings: [],
        } as WorkDeclaration,
      ],
    } as OXNDocument

    const result = categorizeEntities(doc)

    expect(result.probes).toHaveLength(0)
    expect(result.parts).toHaveLength(0)
    expect(result.blueprints).toHaveLength(0)
    expect(result.works).toHaveLength(1)
    expect(result.works[0]!.name).toBe('only-work')
  })
})

// ========================
// extractWorks
// ========================

describe('extractWorks', () => {
  test('提取 Work 列表', () => {
    const doc: OXNDocument = {
      $type: 'OXNDocument',
      entities: [
        {
          $type: 'WorkDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'work-a',
          type: 'task',
          ref: '@prj/bp/a',
          slotBindings: [],
        } as WorkDeclaration,
        {
          $type: 'WorkDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'work-b',
          type: 'flow',
          ref: '@prj/bp/b',
          slotBindings: [],
        } as WorkDeclaration,
      ],
    } as OXNDocument

    const works = extractWorksFromDocument(doc)
    expect(works).toHaveLength(2)
    expect(works[0]!.name).toBe('work-a')
    expect(works[1]!.name).toBe('work-b')
  })
})

// Helper function for testing
function extractWorksFromDocument(doc: OXNDocument) {
  const works: ReturnType<typeof convertWorkDeclaration>[] = []
  for (const entity of doc.entities || []) {
    if (entity.$type === 'WorkDeclaration') {
      works.push(convertWorkDeclaration(entity as WorkDeclaration))
    }
  }
  return works
}
