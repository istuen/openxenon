## Context

### 背景现状

当前 `src/core/manifest.ts` 的 `writeStepManifest()` 直接使用 `writeFileSync`：

```typescript
// 当前实现 (manifest.ts:17-18)
export function writeStepManifest(manifestPath: string, manifest: StepManifest): void {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}
```

`step-manifest.json` 由 AI 进程写入（记录心跳状态），同时由 Daemon 进程的 `ManifestWatcher` 监控。当 AI 正在覆写文件时，watcher 可能读到：

1. 空的 partial 文件
2. 被截断的 JSON 行
3. 包含部分旧数据部分新数据的混乱内容

### 约束条件

- 文件路径不变：`.openxenon/tasks/<task_id>/step-manifest.json`
- rename() 是 POSIX 原子操作，在同一文件系统内保证原子性
- `.tmp` 文件写入失败不能影响原文件
- 需要兼容 Windows（`renameSync` 在 Windows 下如果目标存在会失败，需要先 unlink）

---

## Goals / Non-Goals

**Goals:**
- 将 `step-manifest.json` 的写入改为原子操作
- 避免多进程读写时的文件损坏
- 与 `task-trace.yaml` 的 append-only 模式保持一致的安全写入风格

**Non-Goals:**
- 不改变 `step-manifest.json` 的 JSON 结构
- 不改变 AI 写入 manifest 的频率或时机
- 不实现类似 task-trace 的 append-only 模式（manifest 需要覆写状态，非追加）
- 不实现文件锁（.tmp + rename 已经足够）

---

## Decisions

### Decision 1: .tmp + rename() 原子写入模式

**实现**：
```typescript
import { writeFileSync, renameSync, existsSync, unlinkSync } from 'fs'
import { dirname } from 'path'

export function writeStepManifest(manifestPath: string, manifest: StepManifest): void {
  const tmpPath = manifestPath + '.tmp'

  // 1. 写入临时文件
  writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8')

  // 2. 原子替换目标文件
  // Unix: rename() 原地替换，原子操作
  // Windows: 需要先删除已存在的目标文件
  if (process.platform === 'win32' && existsSync(manifestPath)) {
    unlinkSync(manifestPath)
  }
  renameSync(tmpPath, manifestPath)
}
```

**为什么不用 `fs.writeFileAtomic` 或类似库**：
- v0.1.0 保持极简依赖，不引入额外包
- 手动实现 .tmp + rename 已经足够，且完全可控

**为什么不需要文件锁**：
- rename() 在 POSIX 系统上是原子操作
- 写入 .tmp 时，目标文件保持完整
- 读取方（watcher）在任何时候看到的是完整文件，要么是旧版要么是新版

---

### Decision 2: timestamp 字段的处理

**当前问题**：`createEmptyStepManifest()` 在第27行写入 `timestamp: Date.now()`，违反宪法第四条。

**两个选项**：

| 选项 | 做法 | 优缺点 |
|------|------|--------|
| A | 删除 timestamp 字段 | 简单，但失去"创建时间"语义 |
| B | timestamp 改为由 Daemon 写入时注入 | 需要改更多代码，但符合宪法 |

**选择**：选项 A。

**理由**：
- `step-manifest.json` 是 AI 写给 Daemon 的状态通知，timestamp 语义模糊
- 如果需要时间戳，读取方应使用 `fs.stat.mtime` 或 `fs.stat.ctime`（OS 级别）
- 宪法第四条明确："时间戳的唯一合法来源是 Daemon 的内存时钟或操作系统的 fs.stat"

```typescript
// 修改后
export function createEmptyStepManifest(taskId: string): StepManifest {
  return {
    taskId,
    stepId: '',
    status: 'PENDING',
    artifacts: []
    // 删除 timestamp 字段
  }
}
```

**对于已写入的 manifest**，读取方应这样获取时间戳：
```typescript
import { statSync } from 'fs'
const { mtimeMs } = statSync(manifestPath)
// mtimeMs 即文件最后修改时间，OS 级别，不可伪造
```

---

### Decision 3: 写入失败的处理

**场景**：如果 .tmp 文件写入成功，但 rename 失败（如磁盘满）？

```typescript
export function writeStepManifest(manifestPath: string, manifest: StepManifest): void {
  const tmpPath = manifestPath + '.tmp'
  try {
    writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8')
    if (process.platform === 'win32' && existsSync(manifestPath)) {
      unlinkSync(manifestPath)
    }
    renameSync(tmpPath, manifestPath)
  } catch (err) {
    // 如果 rename 失败，清理残留的 .tmp 文件
    if (existsSync(tmpPath)) {
      unlinkSync(tmpPath)
    }
    throw err
  }
}
```

---

## Risks / Trade-offs

| Risk | 描述 | Mitigation |
|------|------|------------|
| **Windows 兼容** | `renameSync` 在 Windows 下如果目标文件已存在会报 EEXIST | 写入前先 unlink 目标文件（已处理） |
| **.tmp 文件残留** | 如果进程崩溃，.tmp 文件可能残留 | 下次写入时会覆盖；可定期清理 |
| **跨文件系统 rename** | 如果 .tmp 和目标在不同文件系统，rename 会失败（EXDEV） | 目前都在同一目录，无此风险 |

---

## Open Questions

1. **是否需要在 .tmp 写入前检查目标目录存在**？
   - 如果目录不存在，writeFileSync 会自动创建目录
   - 但最佳实践是先确保目录存在，避免隐式创建

2. **是否需要让 AI 的 System Prompt 知道"必须用 .tmp + rename"写入 manifest**？
   - 目前是代码层面的约束，AI 只需要调用 `writeStepManifest()`
   - 如果未来有其他写入方，需要在 System Prompt 中明确
