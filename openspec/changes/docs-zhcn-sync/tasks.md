## 1. 核心概念术语同步

- [x] 1.1 更新 `docs/zh-cn/architecture/concepts.md` — Stage → Part，Task → Work，补充 Hall 概念，**新增 L0-L3 四层架构章节**
- [x] 1.2 重命名 `docs/zh-cn/architecture/stage.md` → `docs/zh-cn/architecture/part.md`，旧路径留重定向文件
- [x] 1.3 更新 `docs/zh-cn/architecture/blueprint.md` — stages[] → parts[]，补充 Blueprint.type 与 Work.type 强绑定说明

## 2. 内部链接修复

- [x] 2.1 修复 `docs/zh-cn/architecture/intro.md` — `02-concepts.md` → `concepts.md`
- [x] 2.2 修复 `docs/zh-cn/architecture/lifecycle.md` — `04-cli-ref.md` → `../guides/cli-reference.md`
- [x] 2.3 修复 `docs/zh-cn/architecture/concepts.md` — `cli-reference.md` → `../guides/cli-reference.md`

## 3. 命令与内容补全

- [x] 3.1 更新 `docs/zh-cn/guides/getting-started.md` — 补充 `oxn forge part` 示例和 `./dist/oxn hall` 命令
- [x] 3.2 更新 `docs/zh-cn/guides/cli-reference.md` — 确保 Task → Work 术语一致

## 4. 目录结构修复

- [x] 4.1 更新 `docs/zh-cn/guides/development.md` — 目录结构描述修正为 en/zh-cn 双 locale 结构

## 5. README 链接修复

- [x] 5.1 修复 `README.md` §9 文档链接 — 添加 `zh-cn/` 前缀

## 6. Arsenal 物理结构修复

- [x] 6.1 更新 `docs/zh-cn/guides/arsenal-guide.md` — 类型优先（Blueprint/Part/Probe），状态嵌套在类型内部（drafts/formal）
- [x] 6.2 更新 `docs/zh-cn/architecture/arsenal.md` — 同步最新物理结构描述

## 7. 验证

- [x] 7.1 grep 搜索残留旧术语（Stage 作为概念名，不包括命令参数）
- [x] 7.2 验证所有文档间链接可访问
- [x] 7.3 验证 L0-L3 四层架构描述的一致性