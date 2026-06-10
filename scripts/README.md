# scripts/

工程级脚本目录。每个脚本入口即用，**不依赖 npm 依赖**（除 `validate-dependencies.ts` 需 bun）。

## 子目录

### `proof-helpers/` — proof 专用 helper（被 `oxn-proof` skill 引用）

| 脚本 | 职责 | 何时用 |
|---|---|---|
| [`proof-helpers/domain-merge-check.py`](#proof-helpersdomain-merge-checkpy) | 域重组保真性证明：旧 6 域去重 term/ban 集 ⊆ 新 3 域去重集 | 任何"X 域合并/拆分为 Y 域" refactor 后 |
| [`proof-helpers/proof-self-check.sh`](#proof-helpersproof-self-checksh) | proof 空间闭环自检：fs 存在 + chmod 0o444 + 签名 + verdict + show 可读 | OXN 升级或 CLI 改 proof 链路后 |

> 详尽使用文档见 [scripts/proof-helpers/README.md](proof-helpers/README.md)（如不存在则读脚本顶部 docstring）

## 平铺脚本

| 脚本 | 职责 | 何时用 |
|---|---|---|
| `restore-skills.sh` | 还原 `.opencode/skills/` 下的 OpenCode 技能包 | 误删 skills 后恢复 |
| `verify-skill-structure.sh` | 校验 `.opencode/skills/*/SKILL.md` 结构合规 | 改 skill 文件后 / CI |
| `validate-dependencies.ts` | 跨 8 个子层的纯 ESM 依赖图检查 | 改 `src/` 后 / CI（`bun run lint` 也调它） |
| `version-check.ts` | 检查 package.json 版本号一致性 | 发布版本前 |
| `version-sync.ts` | 同步 package.json 版本号到各 manifest | 改 package.json 后 |

## 共同约定

- **Shell 脚本必须 `set -u`**（不依赖 `set -e`，让调用方能拿到 exit code）
- **Python 脚本用 argparse 而非 argv 解析**（如适用）
- **Exit code 语义**（统一）：
  - `0` = 成功 / 保真 / 通过
  - `1` = 失败 / 漂移 / 阻断（业务流异常）
  - `2` = 用法错（参数不足 / 缺文件 / 未知子命令）
  - 其他 = 子进程自身异常（极少用）

## 添加新脚本

1. 放在 `scripts/` 或 `scripts/proof-helpers/`（按职责）
2. 文件头 5 行内必须有：
   - `# 名称:`
   - `# 职责:`
   - `# 何时用:`
   - `# 何时不用:`
3. 在本 README 加一行
4. 如果是 proof 链路：嵌入到对应 `proof.oxn` 的 shell probe
5. **不加 unit test**（proof 端到端已覆盖；helper 逻辑简单，加 unit test 性价比低）
