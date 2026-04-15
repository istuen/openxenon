import type { XenonixSkill } from './types'
import { xnInitSkill } from './xn-init'
import { xnTaskSkill } from './xn-task'
import { xnResumeSkill } from './xn-resume'
import { xnStatusSkill } from './xn-status'
import { xnStopSkill } from './xn-stop'
import { xnTraceSkill } from './xn-trace'

export type { XenonixSkill }

export const allSkills: XenonixSkill[] = [
  xnInitSkill,
  xnTaskSkill,
  xnResumeSkill,
  xnStatusSkill,
  xnStopSkill,
  xnTraceSkill,
]

export {
  xnInitSkill,
  xnTaskSkill,
  xnResumeSkill,
  xnStatusSkill,
  xnStopSkill,
  xnTraceSkill,
}
