import { describe, expect, test } from 'bun:test'

import type {
  BlueprintDeclaration,
  Description,
  OXNDocument,
  PartDeclaration,
  ProbeDeclaration,
  PropDeclaration,
  WorkDeclaration,
  TaskDeclaration,
  DomainRefDecl,
  BlueprintRefDecl,
  PartRefDecl,
  ProbeRefDecl,
  TaskPartDecl,
} from '../langium-driver/generated/ast'
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

function mProbe(name: string, desc?: string, props?: PropDeclaration[]): ProbeDeclaration {
  return {
    $type: 'ProbeDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    descriptions: desc ? [mDesc(desc)] : [],
    props: props || [],
    output: [],
  } as ProbeDeclaration
}

function mPart(name: string, desc?: string, props?: PropDeclaration[]): PartDeclaration {
  return {
    $type: 'PartDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    descriptions: desc ? [mDesc(desc)] : [],
    props: props || [],
    probes: [],
    refs: [],
  } as PartDeclaration
}

function mBP(
  name: string,
  props?: PropDeclaration[],
  partSlots?: { name: string; deps?: string[] }[],
): BlueprintDeclaration {
  return {
    $type: 'BlueprintDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    descriptions: [],
    version: 1,
    props: props || [],
    partSlots:
      partSlots?.map((s) => ({
        $type: 'PartSlotDeclaration',
        $containerProperty: '',
        $containerIndex: 0,
        name: s.name,
        deps: s.deps || [],
      })) || [],
  } as BlueprintDeclaration
}

function mDomainRef(name: string, ref?: string): DomainRefDecl {
  return {
    $type: 'DomainRefDecl',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    ref,
  } as DomainRefDecl
}

function mBlueprintRef(name: string, ref?: string): BlueprintRefDecl {
  return {
    $type: 'BlueprintRefDecl',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    ref,
  } as BlueprintRefDecl
}

function mTask(
  name: string,
  domain?: string,
  blueprint?: string,
  parts?: TaskPartDecl[],
  deps?: string[],
): TaskDeclaration {
  return {
    $type: 'TaskDeclaration',
    $containerProperty: '',
    $containerIndex: 0,
    name,
    domain,
    blueprint,
    parts: parts || [],
    deps: deps ? ({ $type: 'TaskDeps', $containerProperty: '', $containerIndex: 0, deps } as any) : undefined,
  } as TaskDeclaration
}

// ========================
// convertWorkDeclaration
// ========================

describe('convertWorkDeclaration', () => {
  test('Work 编排转换 (v0.1-final domain/blueprint/task)', () => {
    const work: WorkDeclaration = {
      $type: 'WorkDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'validate-feature-auth',
      context: undefined,
      domains: [mDomainRef('MemberContext', '@prj/domains/MemberContext')],
      blueprints: [mBlueprintRef('feature-pipeline', '@prj/blueprints/feature-pipeline')],
      parts: [],
      probes: [],
      tasks: [mTask('TestIt', 'MemberContext', 'feature-pipeline', [], [])],
    } as WorkDeclaration

    const result = convertWorkDeclaration(work)
    expect(result.name).toBe('validate-feature-auth')
    expect(result.domains).toHaveLength(1)
    expect(result.domains[0].name).toBe('MemberContext')
    expect(result.blueprints).toHaveLength(1)
    expect(result.blueprints[0].name).toBe('feature-pipeline')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].name).toBe('TestIt')
  })

  test('Work 无 tasks', () => {
    const work: WorkDeclaration = {
      $type: 'WorkDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'simple-work',
      context: undefined,
      domains: [],
      blueprints: [mBlueprintRef('simple')],
      parts: [],
      probes: [],
      tasks: [],
    } as WorkDeclaration

    const result = convertWorkDeclaration(work)
    expect(result.name).toBe('simple-work')
    expect(result.blueprints).toHaveLength(1)
    expect(result.tasks).toHaveLength(0)
  })

  test('Work 无 blueprint', () => {
    const work: WorkDeclaration = {
      $type: 'WorkDeclaration',
      $containerProperty: '',
      $containerIndex: 0,
      name: 'work-no-blueprint',
      context: undefined,
      domains: [],
      blueprints: [],
      parts: [],
      probes: [],
      tasks: [],
    } as WorkDeclaration

    const result = convertWorkDeclaration(work)
    expect(result.name).toBe('work-no-blueprint')
    expect(result.blueprints).toHaveLength(0)
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
          descriptions: [],
          props: [],
          partSlots: [],
        } as BlueprintDeclaration,
        {
          $type: 'WorkDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'deploy-prod',
          context: undefined,
          domains: [],
          blueprints: [mBlueprintRef('ci-pipeline')],
          parts: [],
          probes: [],
          tasks: [],
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
          context: undefined,
          domains: [],
          blueprints: [mBlueprintRef('bp1')],
          parts: [],
          probes: [],
          tasks: [],
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
          context: undefined,
          domains: [],
          blueprints: [mBlueprintRef('plan-bp')],
          parts: [],
          probes: [],
          tasks: [],
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
          context: undefined,
          domains: [],
          blueprints: [mBlueprintRef('a')],
          parts: [],
          probes: [],
          tasks: [],
        } as WorkDeclaration,
        {
          $type: 'WorkDeclaration',
          $containerProperty: '',
          $containerIndex: 0,
          name: 'work-b',
          context: undefined,
          domains: [],
          blueprints: [mBlueprintRef('b')],
          parts: [],
          probes: [],
          tasks: [],
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
