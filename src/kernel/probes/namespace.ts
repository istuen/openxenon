// eslint-disable-next-line no-restricted-imports -- TODO(Phase-3): move pure functions (parseProbeNamespace etc) to kernel; infra then imports from kernel
export type { ProbeNamespace, ParsedProbeRef } from '../../infra/loader'
// eslint-disable-next-line no-restricted-imports
export { parseProbeNamespace, isValidProbeRef, isBareProbeRef } from '../../infra/loader'
