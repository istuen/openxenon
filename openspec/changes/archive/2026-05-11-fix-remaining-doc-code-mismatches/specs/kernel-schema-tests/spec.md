## ADDED Requirements

### Requirement: draft.ts getTypeFromContent 正确检测 Proof 类型

getTypeFromContent SHALL 使用正确字段名检测 YAML/JSON 类型。

#### Scenario: getTypeFromContent 使用 parsed.probes 检测 Proof
- **WHEN** 检测 `{ target: {...}, probes: [...], spec: {...} }` 类型
- **THEN** 返回 `'proofs'`

#### Scenario: getTypeFromContent 使用 parsed.probeRefs 检测 Proof Invocation
- **WHEN** 检测 `{ name: 'test', target: '...', probeRefs: [...] }` 类型
- **THEN** 返回 `'proofs'`

#### Scenario: getTypeFromContent 使用字符串匹配检测 probes
- **WHEN** 检测 YAML 字符串包含 `probes:`
- **THEN** 返回 `'proofs'`

#### Scenario: getTypeFromContent 使用字符串匹配检测 probeRefs
- **WHEN** 检测 YAML 字符串包含 `probeRefs:`
- **THEN** 返回 `'proofs'`

### Requirement: createDraftFromYaml 正确处理 Proof Definition 和 Proof Invocation

#### Scenario: createDraftFromYaml 处理 Proof Definition
- **WHEN** 调用 `createDraftFromYaml` 处理 `{ target: {...}, probes: [...], spec: {...} }`
- **THEN** 路由到 `createDraftProof`

#### Scenario: createDraftFromYaml 处理 Proof Invocation
- **WHEN** 调用 `createDraftFromYaml` 处理 `{ name: '...', target: '...', probeRefs: [...] }`
- **THEN** 路由到 `createDraftProof`

## REMOVED Requirements

### Requirement: getTypeFromContent 不再使用旧字段名

**Reason**: ProofDefinitionSchema 已改用 `probes` 而非 `proofs`

**Migration**: 使用 `parsed.probes` 替代 `parsed.proofs`