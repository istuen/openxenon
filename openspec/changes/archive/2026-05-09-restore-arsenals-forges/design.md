# restore-arsenals-forges - Design

## Current (Broken) Structure

```
src/arsenals/
├── arsenal/           ← 空目录，需删除
├── probes/            ← Probe 定义 (fs_exists, fs_match, shell_exec)
├── standards/         ← ❌ 名字错误！应该是 proofs/
├── paths.ts
├── loader.ts
├── init.ts
└── (missing) forges/  ← Forge 模板丢失！

kernel/constants.ts:
- FORGES_DIR = 'forges'  ← 需删除
- META_DIR = 'meta'       ← 需删除

src/cli/init.ts:
- META_SOURCE_PATH = join(__dirname, '..', 'meta')  ← 指向不存在的目录！

src/cli/forge.ts:
- META_FORGE_NAMES 映射到 'meta-probe' 等
- forgePath = join(projectBoundary, 'meta', name, 'canonical.yaml')
```

## Target Structure

```
src/arsenals/
├── probes/            ← Probe 定义
├── proofs/            ← 验证器 (从 standards 改名)
├── forges/            ← Forge 元模板 (需创建)
│   ├── meta-probe/
│   │   └── canonical.yaml
│   ├── meta-proof/
│   │   └── canonical.yaml
│   ├── meta-stage/
│   │   └── canonical.yaml
│   └── meta-blueprint/
│       └── canonical.yaml
├── paths.ts
├── loader.ts
└── init.ts

kernel/constants.ts:
- 删除 FORGES_DIR
- 删除 META_DIR
- 保留其他常量 (BOUNDARY_DIR, TASKS_DIR, etc.)
```

## Changes Detail

### 1. 重命名 standards → proofs

```bash
mv src/arsenals/standards src/arsenals/proofs
```

更新导入:
- `src/cli/draft.ts`: `from '../arsenals/standards'` → `from '../arsenals/proofs'`

### 2. 创建 forges 目录和模板

从 git history 恢复原始内容 (commit 38dbb12):

**meta-probe/canonical.yaml:**
```yaml
id: meta-probe
name: Meta Probe Forge
status: CANONICAL
stages:
  - id: validate-probe
    name: 验证 Probe 结构
    proof:
      target:
        description: Probe YAML 文件
      spec:
        constraints:
          - "必须包含 type"
          - "type 必须是 fs_exists, fs_content_match, fs_not_exists, fs_parseable, exec_exit_zero 之一"
```

**meta-proof/canonical.yaml:**
```yaml
id: meta-proof
name: Meta Proof Forge
status: CANONICAL
stages:
  - id: validate-proof
    name: 验证 Proof 结构
    proof:
      target:
        description: Proof YAML 文件
      spec:
        constraints:
          - "必须包含 target, spec, probes"
          - "target 必须包含 description"
```

**meta-stage/canonical.yaml:**
```yaml
id: meta-stage
name: Meta Stage Forge
status: CANONICAL
stages:
  - id: validate-stage
    name: 验证 Stage 结构
    proof:
      target:
        description: Stage YAML 文件
      spec:
        constraints:
          - "必须包含 id, name, proof"
          - "proof 必须包含 target, spec, probes"
```

**meta-blueprint/canonical.yaml:**
```yaml
id: meta-blueprint
name: Meta Blueprint Forge
status: CANONICAL
stages:
  - id: validate-blueprint
    name: 验证 Blueprint 结构
    proof:
      target:
        description: Blueprint YAML 文件
      spec:
        constraints:
          - "必须包含 id, name, stages"
          - "stages 必须是数组"
```

### 3. 删除空目录

```bash
rmdir src/arsenals/arsenal/
```

### 4. 更新 src/cli/init.ts

```typescript
// 之前
const META_SOURCE_PATH = join(__dirname, '..', 'meta')

// 之后
const META_SOURCE_PATH = join(__dirname, '..', 'arsenals', 'forges')
```

### 5. 更新 src/cli/forge.ts

```typescript
// 之前
const forgePath = join(projectBoundary, 'meta', name, 'canonical.yaml')

// 之后
const forgePath = join(projectBoundary, 'arsenals', 'forges', name, 'canonical.yaml')
```

### 6. 更新 src/skills/oxn-forge.ts

```typescript
// 之前
const forgePath = join(projectBoundary, 'meta', name, 'canonical.yaml')

// 之后
const forgePath = join(projectBoundary, 'arsenals', 'forges', name, 'canonical.yaml')
```

### 7. 更新 kernel/constants.ts

删除:
- `export const FORGES_DIR = 'forges'`
- `export const META_DIR = 'meta'`

保留:
- `BOUNDARY_DIR`
- `TASKS_DIR`
- `BLUEPRINT_FILE`
- `TASK_TRACE_FILE`
- etc.

## File Changes Summary

| File | Action |
|------|--------|
| `src/arsenals/standards/` | 重命名为 `src/arsenals/proofs/` |
| `src/arsenals/arsenal/` | 删除 |
| `src/arsenals/forges/meta-probe/` | 创建 |
| `src/arsenals/forges/meta-proof/` | 创建 |
| `src/arsenals/forges/meta-stage/` | 创建 |
| `src/arsenals/forges/meta-blueprint/` | 创建 |
| `src/cli/draft.ts` | 更新导入路径 |
| `src/cli/init.ts` | 更新 META_SOURCE_PATH |
| `src/cli/forge.ts` | 更新 forgePath |
| `src/skills/oxn-forge.ts` | 更新 forgePath |
| `src/kernel/constants.ts` | 删除 FORGES_DIR, META_DIR |
