import type { XnStageStatus } from './core';

export interface Stage {
  id: string;
  blueprintId: string;
  name: string;
  deps: string[];
  target: string;
  spec: string;
  action?: string;
  proof: string | string[];
  status: XnStageStatus;
  createdAt?: number;
  completedAt?: number;
}