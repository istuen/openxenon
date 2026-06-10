# Skill 加载机制 — 现状与设计澄清（取代原 v1 草稿）

> 状态：**替代稿**，原 `docs/design/install-skill-v1.md` 中"全局安装"野心作废。
>
> 本文档不引入新功能，只**澄清现状 + 修复已发现的两个小问题**。

---

## 0. 三个澄清（用户主定标准）

1. **`.opencode/skills/oxn-*/SKILL.md` 不是手维护的源** — 它是 `oxn init` 跑出来的产物，源在 `src/skills/locales/<locale>/<id>/instruction.md`。项目仓库里看到 `.opencode/skills/*.md` 是 init 历史写入的副本，**不要手动编辑**。
2. **取消 `oxn install-skill` 命令** — 原计划"装到 `~/.config/opencode/skills/` 全局"的设计**作废**。oxn 不管用户 home 目录。
3. **Skill 加载保持项目级** — 工程师想在某项目里用 `oxn-cli` / `oxn-work` / `oxn-proof`，跑一次 `oxn init` 即可。`oxn init` 已经在干这件事（`src/cli/init.ts:12 → skill-compiler.ts:42`）。

---

## 1. 当前真实数据流（一次确认）

```
src/skills/locales/<locale>/oxn-<id>/instruction.md   ← 唯一权威源（L3 OpenXenon 源码）
src/skills/locales/<locale>/oxn-<id>/references/*.md  ← 唯一权威 references
src/skills/loader.ts: getAllSkillsForLocale()        ← 唯一加载器
src/cli/skill-compiler.ts: compileAllSkills()        ← 唯一编译器
       │
       ▼ oxn init
.cwd/.opencode/skills/<id>/
       ├── SKILL.md                                    ← init 产物
       └── references/blueprint-format.md              ← init 产物（如果该 skill 有 references）
```

OpenCode 扫描 `.opencode/skills/<id>/SKILL.md` → 自动让该 skill 在当前项目可见。
**链路到此为止**。没有"再装到全局"这一步。

---

## 2. 已发现的小问题（待修）

虽然"全局安装"思路作废，但调研过程中**顺手发现两个真实 bug**，仍然值得修：

### 2.1 `src/cli/install-skill.ts` 是个孤儿

- 这文件**不该存在**（既然 install-skill 砍掉）
- 现状：`src/cli/index.ts:153` 还引用着 `'install-skill': () => import('./install-skill')` — 命令依然注册在 CLI 路由里
- **修复**：删 `src/cli/install-skill.ts` + 删 `src/cli/index.ts:153` 路由 + 删 `src/cli/__tests__/oxn-work-skill-v1_1.test.ts:120-138` 那条 E2E（它本来就在测 install-skill 行为）
- 影响面：`docs/reference/cli-reference.md:115-120` 那段说明也要删

### 2.2 双数据源（隐藏风险）

- 未来谁要新加 skill，最容易踩的坑：在 `.opencode/skills/oxn-foo/SKILL.md` 写了 `description`，但忘了在 `src/skills/loader.ts:20-50` 的 `skillMeta[locale]` 里注册
- 结果：OpenCode 看到的 `.opencode/skills/oxn-foo/` 是空的（init 没编译它），工程师以为"加好了"但 OpenCode 永远发现不了
- **缓解**（v1 范围）：在 `src/skills/loader.ts` 顶部加注释 + 在 `CONTRIBUTING` 写一句"新 skill 必须改 `src/skills/locales/`，不能改 `.opencode/skills/`"
- **根治**（v0.2）：让 `oxn init` 报"`.opencode/skills/` 里有未注册 skill"作为 warning — 用 `src/skills/loader.ts:20` 的 `skillMeta` 作为权威名单比对

---

## 3. 与 oxn-proof 的关系

不变。`oxn proof` 是独立 IAP 轴（Proof-First），其 `.openxenon/proofs/<name>/` 目录与 `.opencode/skills/` 物理上完全分离，无任何耦合。

---

## 4. 后续路线（v0.2+，与本澄清稿无关）

- 远程 skill registry（`oxn skill registry <name>`）— P1
- skill 版本自动对齐到 oxn 版本 — P1
- 多 locale 在 OpenCode 内的切换 — P2

任何"oxn 主动写用户 home"的特性，在用户主定标准**变更前**都不做。

---

## 5. 文档同步清单

```
□ src/cli/install-skill.ts                     — 整文件删除
□ src/cli/index.ts:153                         — 删 install-skill 路由
□ src/cli/__tests__/oxn-work-skill-v1_1.test.ts:120-138  — 删 test 11 (E2E 装全局)
□ docs/reference/cli-reference.md:115-120      — 删 install-skill 段
□ src/skills/loader.ts:7                       — 头部加注释：source of truth
□ .changes/                                    — 写一条 .changes/0.1.3-remove-install-skill.md
□ scripts/restore-skills.sh                    — 保留（init 失败时恢复用）— 评审是否仍需要
□ scripts/verify-skill-structure.sh            — 评审是否仍需要（看是否被 lefthook / CI 引用）
```

---

## 6. 设计哲学自检

| 问题 | 答案 |
|---|---|
| 砍掉 install-skill 后，OpenXenon 在 skill 加载上的角色是什么？ | **项目级 runtime**：`oxn init` 编译 `src/skills/` 内容到 `.opencode/skills/`，让 OpenCode 在本仓库里自动发现。**不碰用户 home**。 |
| 为什么不做"全局安装"？ | (a) 越权 — oxn 不该写 `~/.config/`；(b) 不可逆风险（版本冲突 / 卸载脏）；(c) 工程师在 monorepo 里想要某个 skill，在该 repo 跑 `oxn init` 即可，比"装全局"更准确 |
| 工程师装好 oxn 后下一步是什么？ | `cd <my-project> && oxn init`，一行搞定。`oxn-cli` / `oxn-work` / `oxn-proof` 立刻在该项目内被 OpenCode 发现。 |
| 与 OpenCode 官方"Place files"是否兼容？ | 完全兼容 — 写到项目内 `.opencode/skills/<id>/SKILL.md` 正是 OpenCode 第一个扫描路径（[docs/skills#place-files](https://opencode.ai/docs/skills/#place-files)），monorepo 子目录也能继承 |
