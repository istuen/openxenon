import type { XnSpec } from './xn-spec';
import type { XnAction } from './xn-action';
import type { XnStageStatus } from './core';

export interface Step {
  id: string
  name: string
  spec: string
  proof: string
  targetState?: string
}

export interface XnStage {
  id: string;
  name: string;
  xnSpec: XnSpec;
  xnProof: string;
  xnAction?: XnAction;
  xnStageStatus: XnStageStatus;
  targetState?: string;
}

export interface Playbook {
  task: string
  steps: Step[]
}

export interface XnBlueprint {
  id: string;
  xnTaskId: string;
  xnStages: XnStage[];
  status: 'canonical' | 'drafting' | 'executing' | 'pending_review' | 'promoted' | 'rejected';
}
