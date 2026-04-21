import type { XenonixSkill } from './types'
import { oxnInitSkill } from './oxn-init'
import { oxnTaskSkill } from './oxn-task'
import { oxnResumeSkill } from './oxn-resume'
import { oxnStatusSkill } from './oxn-status'
import { oxnStopSkill } from './oxn-stop'
import { oxnTraceSkill } from './oxn-trace'

export type { XenonixSkill }

export const allSkills: XenonixSkill[] = [
  oxnInitSkill,
  oxnTaskSkill,
  oxnResumeSkill,
  oxnStatusSkill,
  oxnStopSkill,
  oxnTraceSkill,
]

export {
  oxnInitSkill,
  oxnTaskSkill,
  oxnResumeSkill,
  oxnStatusSkill,
  oxnStopSkill,
  oxnTraceSkill,
}