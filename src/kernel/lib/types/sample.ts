export interface Sample {
  id: string;
  stageId: string;
  payload: string;
  status: 'pending' | 'approved' | 'rejected';
}