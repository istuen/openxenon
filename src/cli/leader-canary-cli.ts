// src/cli/leader-canary-cli.ts
//
// Entry point for the `oxn leader` subcommand in mvp canary mode
// (OXN_LEADER_MODE=mvp). Re-exports the default export of the mvp leader
// CLI from src/leader-canary/oxn-leader.ts, with its imports rewritten to
// point at the mvp-flavoured DSL and work modules under src/oxn-dsl-mvp/ and
// src/work-mvp/.
//
// Subcommands exposed (inherited from the mvp leader):
//   leader new    --name <name> [--blueprint-file <path>] [--output-dir <dir>]
//   leader run    --work-file <work.oxn>
//   leader submit --work-name <name>
//   leader status --work-name <name>

import oxnLeader from '../leader-canary/oxn-leader'

export default oxnLeader
