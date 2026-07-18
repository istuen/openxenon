# ADR-0010: PathPort 注入原理（L0 不能硬编码路径）

> **来源**：`docs_tmp/kernel-45.md`, `kernel-46.md` (2026-05-26)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L0-Contract / L1-Infra

## 决策

Kernel 不直接调 `path.join` / `path.resolve`。所有路径操作通过 `PathPort` 注入：

```ts
// L0-Contract 定义接口
interface PathPort {
  join(...parts: string[]): string
  resolve(p: string): string
  relative(from: string, to: string): string
}

// L1-Infra 提供实现
class NodePathPort implements PathPort { ... }
```

## 原因

- L0 不能假定运行环境是 Node 还是 Bun
- L0 不能硬编码绝对路径（如 `/tmp/`）
- L1 可注入 Path / Hash / Fs / Clock 等 Port，让 L0 跨 runtime 可移植

## 后果

- ✅ L0 真空 = L0 只依赖 Schema + Contract ports
- ✅ 同一 L0 可跑在 Bun / Node / 浏览器（未来）
- 🔗 当前 `src/infra/` + `kernel/contracts/` 已落实

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-26-kernel-45.md`
- AGENTS.md L0-Contract