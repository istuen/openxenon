/**
 * Goal namespace barrel (D5+ 2026-08-07)
 *
 * 5 command 后端：
 *   - createGoal：写 dev/pool/<slug>.md frontmatter
 *   - listGoals：列 dev/pool/*.md frontmatter（排除 README）
 *   - showGoal：读单个 Goal 文件
 *   - createWorkFromGoal：D5+ stub（返回建议 Work 配置，不创建）
 *   - archiveGoal：移到 .archived/dev/pool/
 *
 * 命名空间区别于 Draft（探索稿）/ Pool（Intent Pool 已退役）/ Work（IAP 执行）
 */
export {
  createGoal,
  listGoals,
  showGoal,
  createWorkFromGoal,
  archiveGoal,
  type GoalCreateInput,
  type GoalCreateResult,
  type GoalCreateError,
  type GoalListItem,
  type GoalListResult,
  type GoalShowResult,
  type GoalShowError,
  type GoalWorkCreatorInput,
  type GoalWorkCreatorResult,
  type GoalArchiveResult,
} from './manager'

export { planMigration, applyMigration } from './dev-pool-migrator'
