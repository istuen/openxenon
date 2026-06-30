# 0.4.0 PR-C4 — self-developed layer 收口 (md-bridge → md-pipeline)

> v0.4 RFC PR-C4 收口: 删 md-bridge 自研层 649 行, 用 md-pipeline unified-native 实现取代
> 5 EntityCompilers 切到 utils.ts 别名, 保留 compat 路径

## 背景

v0.3.4 md-bridge 10252 行是 hybrid (unified + 自研):
- extract-headings.ts (237 行) — mdast → heading tree 自研遍历
- extract-list-fields.ts (302 行) — mdast list → key-value 自研解析
- driver-registry.ts (110 行) — langium + mdast driver 切换

v0.4 PR-C1/C2/C3 已建 unified-native (utils.ts + transformers/ + plugins/), 
PR-C4 收口删自研层 + 5 compilers 切到 utils.ts 别名.

## 变更

### 删除 (共 649 行 + 3 test 文件)
- src/oxl/md-bridge/driver-registry.ts (110 行)
- src/oxl/md-bridge/extract-headings.ts (237 行)
- src/oxl/md-bridge/extract-list-fields.ts (302 行)
- src/oxl/md-bridge/__tests__/oxl-driver.test.ts
- src/oxl/md-bridge/__tests__/extract-headings.test.ts
- src/oxl/md-bridge/__tests__/extract-list-fields.test.ts

### 新增 (compat aliases)
- src/oxl/driver.ts (120 行) — 取代 driver-registry
  * 唯一 driver = 'unified' (替代 'langium' / 'mdast' 两个旧 driver)
  * compat: 'langium' / 'mdast' 名都映射到 unified
- src/oxl/md-pipeline/utils.ts 加别名:
  * extractHeadingContexts → collectHeadingContexts
  * extractListFields → collectListFields
  * findH1 (兼容 API: 返回 { entity, name, text, position: { line, column } })
  * getScalar (从 ListField[] 取 string)
  * getArray (从 ListField[] 取 string[]; 旧 API 行为)
  * h4Sections 字段 (旧 extractHeadingContexts API)

### 改动 (5 compilers + 3 helpers)
- src/oxl/md-bridge/compilers/{work,task,domain,blueprint,proof}-compiler.ts
  * extract-* imports → md-pipeline/utils.js 别名
- src/oxl/md-bridge/{mdast-to-kernel,mdast-validator,remark-to-mdast}.ts
  * 同上
- src/oxl/md-bridge/mdast-validator.ts 迁移 path fix
- src/oxl/md-bridge/index.ts barrel 删 driverRegistry 引用
- src/oxl/index.ts barrel 删 driverRegistry 引用
- scripts/check-md-canonical.ts 路径迁移

### md-pipeline barrel (md-pipeline/index.ts) 扩展
- 导出 5 transformers (PR-C2)
- 导出 remark-canonical (PR-C3)
- 5 实体 IR 类型 + 5 H2 分类白名单常量

## 兼容性 (compat 期间)

- ✅ v0.3.4 mdast-validator.ts / oxl-md-* 5 compilers 仍可用
- ✅ 旧 `extractHeadingContexts` / `extractListFields` / `findH1` 函数名别名保留
- ✅ 旧 `driverRegistry` 引用从 barrel 移除 (但函数名未迁移, v0.5 完全删)
- ✅ 现有 1764 tests → 1726 (删 3 test 文件, 加 driver.ts + md-pipeline 测试)

## 验证

- 1726/1726 全仓库 tests pass (was 1764, -38 因为删 3 个测试文件)
- typecheck clean (0 error)
- 5 compilers 测试仍 pass (行为等价 — 用旧 API 名字走 utils.ts 别名)

## 后续 (v0.4 RFC §4)

- PR-E: v0.4.0 发布 (CHANGELOG + npm publish + GitHub Release + 文档 SSOT)
- v0.5 视情况:
  * 完全删除 md-bridge 自研层 (mdast-validator / oxl-md-* 5 compilers 全部重写)
  * 升 unified v12/v13 (本 PR 保持 v11)
  * 工作流迁移: work.ts 切到读 work.md (目前 work.oxn 仍是 source of truth)
