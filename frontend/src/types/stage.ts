export interface Stage {
  id: number;
  title: string;
  description: string | null;
  start_date: string | null;
  deadline: string | null;
  status: string;
  expected_result: string | null;
  group_id: number;
}
