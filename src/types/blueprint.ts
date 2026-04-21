import type { Stage } from './stage';

export interface Step {
  id: string;
  name: string;
  spec: string;
  proof: string;
  targetState?: string;
}

export interface Blueprint {
  id?: string;
  taskId?: string;
  task?: string;
  stages?: Stage[];
  steps?: Step[];
  status?: 'canonical' | 'drafting' | 'executing' | 'pending_review' | 'promoted' | 'rejected';
}