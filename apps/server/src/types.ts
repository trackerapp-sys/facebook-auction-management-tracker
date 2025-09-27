
export interface FacebookComment {
  id: string;
  from?: {
    name: string;
    id: string;
  };
  message: string;
  created_time: string;
}
