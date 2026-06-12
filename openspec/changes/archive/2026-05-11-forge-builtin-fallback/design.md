## Context

`oxn forge probe` 在新项目里返回"元Forge 'probe' 不存在"，原因是 `loadMetaForge` 只查项目级 `.openxenon/arsenals/forges/meta-probe/canonical.yaml`，找不到就返回 null。

三个具体问题：

**问题 1：`loadMetaForge` 无 fallback**
`src/cli/forge.ts` 的 `loadMetaForge` 只查项目级目录：
```typescript
const projectBoundary = join(process.cwd(), BOUNDARY_DIR)
const forgePath = join(projectBoundary, 'arsenals', 'forges', name, 'canonical.yaml')
// 找不到 → null → "元Forge 'probe' 不存在"
```

**问题 2：`arsenalListStandards` 无内置级 fallback**
`src/arsenals/loader.ts` 的 fallback 只到全局级 `~/.openxenon/arsenals/`，没有包含内置级 `src/arsenals/`。

**问题 3：Skills 引用 daemon**
`src/skills/oxn-task.ts` 包含 `oxn daemon start` 指令，但 daemon 在编译后不可用（硬编码 `./src/server.ts`）。且 `oxn arsenal search` 依赖 daemon，改用 `oxn arsenal list`。

## Goals / Non-Goals

**Goals:**
- `oxn forge probe` 在任何项目（包括空项目）都能显示内置 meta-forge 的约束
- `oxn arsenal list` 能列出内置资产
- Skills 能在编译后的 oxn 上自举，不依赖 daemon
- 构建产物 `dist/` 包含内置资产

**Non-Goals:**
- 修复 daemon 打包问题（已知缺陷 P2，后续单独处理）
- 重构目录结构（保持现有 `src/arsenals/` 结构不变）
- 修改 CLI 接口（命令参数、输出格式不变）

## Decisions

### Decision 1：`loadMetaForge` 三级 fallback

**方案**：在 `forge.ts` 的 `loadMetaForge` 中增加三级 fallback：
1. 项目级：`{cwd}/.openxenon/arsenals/forges/{name}/canonical.yaml`
2. 全局级：`~/.openxenon/arsenals/forges/{name}/canonical.yaml`
3. 内置级：`{BUILTIN_ROOT}/forges/{name}/canonical.yaml`

**BUILTIN_ROOT 计算**：
```typescript
// 编译后：dirname(fileURLToPath(import.meta.url)) → dist/ 目录
// join(that, 'arsenals') → dist/arsenals/
const BUILTIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'arsenals')
```

**验证**：`bun build --compile` 后，`import.meta.url` 指向二进制自身路径（`file:///path/to/dist/oxn`），`dirname` 拿到 `dist/`，加上 `arsenals` 正好命中 `dist/arsenals/`。

**备选方案 A**：重构到 `src/arsenals/builtin/` 目录——需要移动文件，不采纳。
**备选方案 B**：用 `process.argv[0]` 推算——依赖 bun 在 PATH 里，不可靠。

### Decision 2：构建脚本复制内置资产

**改动**：`package.json` 的 `build` 脚本增加 `cp -r src/arsenals dist/arsenals`

产物结构：
```
dist/
├── oxn              ← import.meta.url 指向这里
└── arsenals/        ← cp -r 复制
    ├── forges/
    │   ├── meta-probe/canonical.yaml
    │   ├── meta-proof/canonical.yaml
    │   ├── meta-stage/canonical.yaml
    │   └── meta-blueprint/canonical.yaml
    └── probes/
        ├── fs-exists/canonical.yaml
        └── ...
```

### Decision 3：Skills 替换 `search` → `list`

**改动**：`src/skills/oxn-task.ts` 中：
- 删除 `oxn daemon start` 相关指令
- 将 `oxn arsenal search <关键词>` 替换为 `oxn arsenal list`

**理由**：`oxn arsenal search` 依赖 daemon 的 Registry（通过 Unix Socket 通信），而 `oxn arsenal list` 是纯文件操作，不依赖 daemon。

### Decision 4：`loader.ts` 增加内置级 fallback

**改动**：在 `src/arsenals/loader.ts` 的 `scanArsenalsDirectory` 中增加第三级查找。

当前 fallback 链：
- `scope: 'project'` → 只查项目级
- `scope: 'global'` → 只查全局级
- `scope: 'fallback'` → 项目级，找不到再查全局级

新增：
- `scope: 'builtin'` → 只查内置级 `src/arsenals/`
- `scope: 'fallback'` 扩展为：项目级 → 全局级 → 内置级

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `import.meta.url` 在不同 Bun 版本行为差异 | 仅在 Bun 1.0+ 测试，当前项目要求 `node: >=18` 但实际用 Bun |
| 内置资产和项目级资产重名时优先级 | 项目级优先于内置级，符合预期（自定义Override 内置） |
| Skills 改用 `list` 后搜索功能缺失 | `search` 是 daemon 增强功能，P2 再修；当前自举只需要 `list` |

## Open Questions

1. **daemon 独立打包**：当前 `oxn daemon start` 编译后不可用。需要决定是（A）把 server.ts 也编译进二进制，还是（B）独立打包 daemon。**选择 B**，作为 P2 处理。
2. **全局级 `.openxenon/arsenals/` 的存在性**：`oxn init` 是否应该创建这个目录？当前不会。内置级 fallback 使得这个目录不再是必需的。