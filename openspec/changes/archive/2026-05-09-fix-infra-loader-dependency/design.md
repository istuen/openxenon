## Context

`infra/loader.ts` 当前存在物理倒灌问题：

```
❌ 当前（违规）
infra/loader.ts → import { getProjectBoundaryPath } from '../kernel'
                 → 计算路径 → 读文件
```

根据 architecture.md 第 10.1 节 ESLint 铁丝网：
```javascript
{ group: ['src/kernel/*', ...], target: 'src/infra/**',
  message: '🚨 宪法违规：Infra 是纯物理电线，不能包含任何业务逻辑依赖！' }
```

Infra（物理能力层）只能做 I/O 操作，不能包含任何业务逻辑。路径计算是业务逻辑，属于 Kernel。

## Goals / Non-Goals

**Goals:**
- 消除 `infra/loader.ts` 对 `src/kernel/**` 的导入依赖
- 所有路径计算由 CLI/Daemon 负责，Infra 只接收字符串路径
- 添加 ESLint 规则防止未来再次出现此类违规

**Non-Goals:**
- 不改变 `infra/loader.ts` 的 I/O 功能（文件扫描、读取、重命名）
- 不修改 CLI/Daemon 的整体架构
- 不涉及其他 Infra 模块（如 `infra/fs.ts`）

## Decisions

### Decision 1: 函数签名重构

**问题**: `scanNewStructure()`, `scanArsenalsDirectory()`, `loadStandardByName()`, `resolveAssetPath()` 都调用了 `getProjectBoundaryPath(process.cwd())`

**解决方案**: 所有这些函数改为接收路径字符串参数

```typescript
// Before (违规)
function scanNewStructure(type: AssetType, state: AssetState, scope: Scope = 'fallback'): StandardAsset[] {
  const projectBoundary = getProjectBoundaryPath(process.cwd())  // ❌ Infra 调用 Kernel
  ...

// After (合规)
function scanNewStructure(rootPath: string, type: AssetType, state: AssetState): StandardAsset[] {
  // rootPath 由调用方计算后传入
  const typePath = join(rootPath, type)
  ...
```

### Decision 2: 调用方改造

**方案**: CLI/Daemon 负责路径计算，Infra 只做物理扫描

```
✅ 正确链路:
CLI/Daemon → 调用 Kernel: getProjectBoundaryPath(cwd) → 得到路径字符串
CLI/Daemon → 调用 Infra: loader.scan(路径字符串) → 读文件返回内容
```

需要更新的调用方：
- `src/arsenals/loader.ts`（re-export 层，需要确保调用 Infra 时传入完整路径）
- 需要确认所有调用 `infra/loader.ts` 的地方都已经有完整路径

### Decision 3: ESLint 规则添加

```javascript
// .eslintrc.json 新增规则
{
  "files": ["src/infra/**"],
  "excludedFiles": ["src/infra/**/*.test.ts"],
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "name": "src/kernel",
        "message": "🚨 宪法违规：Infra 是纯物理电线，不能包含任何业务逻辑依赖！"
      }
    ]
  }
}
```

## Risks / Trade-offs

- [Risk] 函数签名改变会导致大量调用方需要更新
  - → Mitigation: 使用 TypeScript 重载，确保类型安全；分步骤实施

- [Risk] CLI/Daemon 原本没有路径计算逻辑，现在需要增加
  - → Mitigation: `getProjectBoundaryPath` 依然在 Kernel，CLI/Daemon 只是调用它获取字符串

## Open Questions

- 是否需要为 `infra/loader.ts` 增加单元测试？建议增加，因为重构后需要保证 I/O 功能不受影响