import type { Spec } from './spec';
import type { Action } from './action';
import type { XnStageStatus } from './core';

export interface Stage {
  id: string;
  name: string;
  spec: Spec;
  proof: string;
  action?: Action;
  status: XnStageStatus;
  targetState?: string;
}