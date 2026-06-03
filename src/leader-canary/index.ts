// src/leader-canary/index.ts
//
// Canary entrypoint. Holds the **complete mvp (v1.0.0-alpha) leader CLI** as
// an OXN_LEADER_MODE=mvp canary alongside the reference-native leader
// (src/cli/leader.ts, OXN_LEADER_MODE=reference).
//
// Subcommands exposed (full mvp leader):
//   leader new    — generate work.oxn skeleton from a blueprint
//   leader run    — start a work state machine
//   leader submit — advance the state machine by one part
//   leader status — read a work's current state
//
// The canary pulls in a **separate copy** of the mvp OXN parser and work
// state machine under src/oxn-dsl-mvp/ and src/work-mvp/. The reference
// Port/Contract compiler, Hall, Daemon, Watcher and the reference work
// modules remain untouched.
//
// Why a separate -mvp copy: the mvp and reference OXN DSL grammars are
// strict supersets of each other (mvp ⊃ reference for the work/parts/skill
// extensions). A single shared parser cannot serve both. The canary pattern
// lets both tracks co-exist until a future unification lands.

export { default } from './oxn-leader'
