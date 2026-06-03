// src/leader-canary/index.ts
//
// Canary entrypoint: holds the mvp (v1.0.0-alpha) state-machine core
// (state schema, state-io, trace) as a reference for the reference
// architecture. The canary is wired in via the OXN_LEADER_MODE env var;
// reference's own leader CLI (src/cli/leader.ts, subcommands
// start|next|list) remains the default and is untouched.
//
// Why this is a "canary" and not a full port: mvp's leader.ts depends on
// Langium-based OXN parsing (createOxnServices/OxnParser in
// src/oxn-dsl/langium/...), which reference does not have (reference uses
// the Port/Contract blueprint compiler instead). Porting the full mvp
// leader would require rebuilding the parsing layer; that is intentionally
// out of scope for this dual-track bootstrap. The canary surfaces the
// *state-machine* primitives so the reference architecture can adopt them
// incrementally.

export {
  WorkStateSchema,
  type WorkState,
  type PartSpec,
  type PartSkillSnapshot,
  type SkillContextSnapshot,
} from './state'

export {
  getStatePath,
  getTracePath,
  getFrozenPath,
  getWorkDir,
  loadState,
  saveState,
  stateExists,
} from './state-io'

export { appendTrace, readTrace, type TraceEvent } from './trace'
