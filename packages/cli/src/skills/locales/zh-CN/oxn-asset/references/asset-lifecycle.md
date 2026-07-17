# Asset 生命周期（删除/归档）

> 本文件是 `oxn-asset` Skill 的按需加载补充。删除/归档 Asset 时查阅。

## 归档（推荐）

### 步骤 1：标记废弃

```bash
oxn asset archive MemberContext --reason "业务边界已合并到 IdentityContext" --json
```

效果：
- Asset `.oxn` / `.md` 移动到 `.openxenon/.archived/assets/<kind>s/<name>.oxn`
- `metadata` 写入归档原因、归档时间、原 citations
- planLock 仍可查询（只读）

### 步骤 2：通知引用方

归档后，所有引用此 Asset 的 Work 应：
- 更新 `domain "X" ref "..."` 改为新 Asset
- `oxn work lock` 重新锁
- 旧 Work 的 `context.md` 记录归档事件

### 步骤 3：DAG 校验

`oxn asset validate --check-dag --all` 验证：
- 没有任何 Work 引用已归档 Asset（应全部切到新 Asset）
- 没有 Asset 的 references 指向已归档 Asset

## 硬删除（不推荐）

仅在**确认无任何引用**且**业务团队同意**时才使用：

```bash
oxn asset delete MemberContext --force --json
```

效果：
- 直接删除 `.oxn` / `.md`
- `assets.json` slim 索引删除
- git history 保留（可恢复）

## 反模式

- ❌ 硬删除被引用的 Asset（引用方 Work `run` 会 `fail-fast`）
- ❌ 归档后不改 Work（导致 `MISSING_ASSET` 错误）
- ❌ 跳过 DAG 校验就归档（DAG 漂移）