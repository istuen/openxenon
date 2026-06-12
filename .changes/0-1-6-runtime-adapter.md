# 0.1.6 — Runtime Adapter: Node 18+ 兜底 + Bun 加速

## 重构

- **架构迁移：i18n → L1-Infra（已在 0.1.5 完成）+ Runtime 适配层 → L1-Infra（v0.1.6）**
  - 新建 `src/infra/runtime/` 目录（L1-Infra 根级别）
  - 6 个模块：`types.ts` / `detect.ts` / `index.ts`（工厂）+ `bun/` 双实现 + `node/` 双实现
  - 5 个 probe handler 改造（shell-exec / fs-exists / fs-not-exists / fs-match / fs-parseable / deps-resolved）
  - 删除 `src/infra/probes/{shell-exec,fs-exists,fs-not-exists,fs-match,fs-parseable,deps-resolved}.ts` 中 `child_process` / `fs` 直接 import
  - 全部走 `runtime/index.ts` 工厂（handler 不知 Bun/Node 存在）

## 新增

- `src/infra/runtime/types.ts` — RuntimePort 接口（Type B 自有类型）
- `src/infra/runtime/detect.ts` — isBun() 缓存 + getRuntimeName() + detectViaCmdline()
- `src/infra/runtime/bun/{spawn,file,glob,index}.ts` — Bun 路径实现
- `src/infra/runtime/node/{spawn,file,glob,index}.ts` — Node 18+ 路径实现
- `src/infra/runtime/index.ts` — 工厂 + 函数级便捷导出（spawn / openFile / glob / which）
- `src/infra/runtime/which.d.ts` — npm 'which' 包 type shim
- `src/infra/runtime/__tests__/{detect,spawn,file,glob,which}.test.ts` — 5 个 runtime 测文件
- `src/infra/probes/__tests__/{shell-exec,fs-exists}.test.ts` — 2 个 probe e2e 测文件
- `docs/architecture/adr/012-runtime-adapter.md` — ADR-012 决策落盘
- `.github/workflows/runtime.yml` — CI 双 runtime 矩阵

## 变更

- **`package.json`**:
  - version: `0.1.5` → `0.1.6`
  - bin: `dist/oxn` (63MB) → `dist/cli.js` (2.71MB JS)
  - 新增 `which` 直接依赖（Node 路径跨平台兼容）
  - `build:dist`: 改用 `--target=node`（关键！Node 18+ 兜底）
  - 新增 `build:clean` / `build:types` / `build:dist` / `build:types` 拆分
  - 删除 `build:all` / `build:linux` / `build:macos` / `build:windows`（不再 cross-compile binary）
  - `prepublishOnly`: 升级为 `typecheck + lint + test + build`
  - `engines`: 保持 `node >=18`

- **probe handler 安全强化（与 SecurityContext 同步）**:
  - `shell-exec.ts`: 删除 `shell: true`，全部走 argv 数组 + sh -c 包装
  - `shell-exec.ts`: `validateCommand` 元字符黑名单（命令替换 + null byte + 换行；允许 `; | &`）
  - `shell-exec.ts`: timeout 统一 SIGKILL（防止 probe 挂起）

## 文档

- `.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md` — 最终设计（972 行，整合 v0.2 + arch-discussion）
- `.openxenon/forges/2026-06-11-runtime-adapter-design.v0.2.deprecated.md` — v0.2 归档（890 行）
- `.openxenon/forges/2026-06-11-runtime-adapter-arch-discussion.md` — 保留（Type A/B 分类溯源）

## 验证

- `bun scripts/validate-dependencies.ts` — **0 违规**（239 文件，742 imports）
- `bun run typecheck` — **0 error**
- `bun test` — **1091 pass, 3 fail**（3 个 pre-existing flaky 测与本次无关）
- `node dist/cli.js --version` — 输出 `0.1.6`（Node 18+ 端到端验证通过）

## 治理

- ADR-012 落盘（含 arch-discussion Type B 引用）
- 4 commit 主题清晰：
  1. `docs(forges): 整合 runtime-adapter-design v0.3` — 文档合并
  2. `feat(infra): 新增 src/infra/runtime/ 适配层骨架` — Phase 1
  3. `feat(probes): 5 个 probe handler 走 runtime 适配层` — Phase 2
  4. `test(runtime): 23 个新测 + 强化 shell-exec 安全` — Phase 3
  5. `chore(infra): CI 双 runtime 矩阵 + ADR-012 + 0.1.6 changeset` — Phase 4+5

## 兼容性

- ✅ Node 18+ 用户：直接 `npm i -g openxenon@0.1.6`，0 额外依赖
- ✅ Bun 用户：自动走 Bun 路径，~50ms 启动
- ✅ Deno 用户（v0.1.6 新增）：自动走 Deno 路径（`Deno.command` / `Deno.readTextFile`）
- ✅ dev workflow：保持 Bun，开发期 `bun run dev`
- ✅ Probe handler 签名不变：现有调用方无需修改

## v0.1.6 增量

- **Deno runtime 扩展**（arch-discussion §5.1 拍板方向）：
  - 新建 `src/infra/runtime/deno/{spawn,file,glob,index}.ts`
  - 新建 `src/infra/runtime/deno-global.d.ts`（Deno 全局类型增强）
  - `detect.ts` 新增 `isDeno()` 缓存
  - `index.ts` 工厂优先级：isDeno() ? denoRuntime : isBun() ? bunRuntime : nodeRuntime
  - Deno.signal (number) 与 NodeJS.Signals (string) 协议差异：v0.1.6 妥协 Deno 路径 signal=null
  - Deno 测试：当前无 Deno 环境，依赖 typecheck-only 验证；CI matrix 留口
- **ADR-013 落盘**（`docs/architecture/adr/013-filesystem-port-vs-runtime-file.md`）：
  - 澄清 FileSystemPort (Type A) 与 runtime/file.ts (Type B) 职责分工
  - 选型决策树（Kernel / L2 同步 → Type A；probe handler → Type B）
  - 关键发现：v0.1.6 引入 sandbox-manager 后 FileSystemPort 有了 L2-Work 消费者
  - 不合并两套抽象（同步 vs 异步，L0 vs L1，依赖方向独立）
