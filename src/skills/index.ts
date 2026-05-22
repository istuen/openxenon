import type { OpenXenonSkill } from './types'
import { oxnInitSkill } from './oxn-init'
import { oxnTaskSkill } from './oxn-task'
import { oxnResumeSkill } from './oxn-resume'
import { oxnStatusSkill } from './oxn-status'
import { oxnStopSkill } from './oxn-stop'
import { oxnTraceSkill } from './oxn-trace'
import { oxnForgeSkill } from './oxn-forge'
import { oxnExploreSkill } from './oxn-explore'
import { oxnArsenalSkill } from './oxn-arsenal'

export type { OpenXenonSkill }

export const allSkills: OpenXenonSkill[] = [
  oxnInitSkill,
  oxnTaskSkill,
  oxnResumeSkill,
  oxnStatusSkill,
  oxnStopSkill,
  oxnTraceSkill,
  oxnForgeSkill,
  oxnExploreSkill,
  oxnArsenalSkill,
]

export {
  oxnInitSkill,
  oxnTaskSkill,
  oxnResumeSkill,
  oxnStatusSkill,
  oxnStopSkill,
  oxnTraceSkill,
  oxnForgeSkill,
  oxnExploreSkill,
  oxnArsenalSkill,
}
