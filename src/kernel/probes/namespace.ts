// eslint-disable-next-line no-restricted-imports -- TODO(Phase-3): move pure functions (parseProbeNamespace etc) to kernel; infra then imports from kernel
export type { ParsedProbeRef, ProbeNamespace } from '../../infra/loader'
// eslint-disable-next-line no-restricted-imports
export { isBareProbeRef, isValidProbeRef, parseProbeNamespace } from '../../infra/loader'
