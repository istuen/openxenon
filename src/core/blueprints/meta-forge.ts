import { BlueprintSchema, type Blueprint } from '../../types/arsenal/blueprint'

export const metaForgeBlueprint: Blueprint = {
  id: 'meta-forge',
  name: 'Meta Forge Blueprint',
  status: 'CANONICAL',
  stages: [
    {
      id: 'create-blueprint',
      name: '创建 Blueprint',
      deps: [],
      proof: {
        target: {
          description: 'Blueprint YAML 文件',
          glob: '**/*.yaml',
        },
        spec: {
          description: '验证 Blueprint YAML 结构',
          constraints: [
            '必须包含 id, name, stages',
            'stages 必须是数组',
            '每个 stage 必须包含 id, name, proof',
          ],
        },
        probes: [
          {
            type: 'fs_exists',
            pattern: '**/*.yaml',
          },
        ],
      },
    },
    {
      id: 'create-stage',
      name: '创建 Stage',
      deps: [],
      proof: {
        target: {
          description: 'Stage YAML 文件',
          glob: '**/*.yaml',
        },
        spec: {
          description: '验证 Stage YAML 结构',
          constraints: [
            '必须包含 id, name, proof',
            'proof 必须包含 target, spec, probes',
            'deps 必须是字符串数组',
          ],
        },
        probes: [
          {
            type: 'fs_exists',
            pattern: '**/*.yaml',
          },
        ],
      },
    },
    {
      id: 'create-proof',
      name: '创建 Proof',
      deps: [],
      proof: {
        target: {
          description: 'Proof YAML 文件',
          glob: '**/*.yaml',
        },
        spec: {
          description: '验证 Proof YAML 结构',
          constraints: [
            '必须包含 target, spec, probes',
            'target 必须包含 description',
            'spec 必须包含 description',
            'probes 必须是数组',
          ],
        },
        probes: [
          {
            type: 'fs_exists',
            pattern: '**/*.yaml',
          },
        ],
      },
    },
  ],
}

export function parseMetaForgeBlueprint(data: unknown): Blueprint {
  return BlueprintSchema.parse(data)
}

export function safeParseMetaForgeBlueprint(data: unknown) {
  const result = BlueprintSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}