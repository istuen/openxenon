export type BlueprintStatus = 'DRAFT' | 'CANONICAL' | 'SAMPLE' | 'ABANDONED'

export interface Blueprint {
  id: string;
  taskId: string;
  name: string;
  status: BlueprintStatus;
  createdAt: number;
}