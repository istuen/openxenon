import type { Stage } from './stage';

export interface Blueprint {
  id: string;
  taskId: string;
  stages: Stage[];
  status: 'canonical' | 'drafting' | 'executing' | 'pending_review' | 'promoted' | 'rejected';
}