import type { BlueprintStatus } from './core';

export interface Blueprint {
  id: string;
  taskId: string;
  name: string;
  status: BlueprintStatus;
  createdAt: number;
}