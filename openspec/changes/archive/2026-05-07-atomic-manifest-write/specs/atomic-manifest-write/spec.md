## ADDED Requirements

### Requirement: Atomic manifest write

`step-manifest.json` 的写入必须采用 .tmp + rename() 模式，确保多进程访问时的文件完整性。

#### Scenario: 正常写入
- **WHEN** 调用 `writeStepManifest(manifestPath, manifest)`
- **THEN** 系统先写入 `<manifestPath>.tmp`，再通过 rename() 原子替换目标文件

#### Scenario: Windows 平台兼容
- **WHEN** 在 Windows 平台上执行写入
- **THEN** 系统先删除已存在的目标文件，再执行 rename()

#### Scenario: 写入失败清理
- **WHEN** .tmp 文件写入成功但 rename 失败
- **THEN** 系统清理残留的 .tmp 文件，并抛出原始错误

---

### Requirement: Manifest timestamp 来源

`StepManifest` 结构中的 timestamp 字段应被移除。时间戳由读取方通过 `fs.stat(manifestPath).mtimeMs` 获取。

#### Scenario: 读取 manifest 文件时间戳
- **WHEN** 需要获取 manifest 的最后修改时间
- **THEN** 使用 `fs.statSync(manifestPath).mtimeMs`，不使用 manifest 内容中的 timestamp 字段

#### Scenario: createEmptyStepManifest 不包含 timestamp
- **WHEN** 调用 `createEmptyStepManifest(taskId)`
- **THEN** 返回的 StepManifest 不包含 timestamp 字段

---

## MODIFIED Requirements

本文档无其他修改的 requirements。

所有其他 step-manifest.json 的行为（字段结构、status 状态机、artifacts 数组）保持不变。
