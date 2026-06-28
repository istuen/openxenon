export interface Sample {
  id: string
  partId: string
  payload: string
  status: 'pending' | 'approved' | 'rejected'
}
