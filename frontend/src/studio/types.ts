export type { Group } from "../types/group";
export type { Stage } from "../types/stage";
export type { Task as Epic } from "../types/task";
export type { Subtask, SubtaskStatus } from "../types/subtask";
import type { Group } from "../types/group";
import type { Stage } from "../types/stage";
import type { Task } from "../types/task";
import type { Subtask } from "../types/subtask";
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}
export interface Member {
  id: number;
  name: string;
  email: string;
  is_leader: boolean;
}
export interface Comment {
  id: number;
  text: string;
  author_id: number;
  created_at: string;
}
export interface History {
  id: number;
  user_id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}
export interface Workspace {
  groups: Group[];
  epics: Task[];
  stages: Stage[];
  subtasks: Subtask[];
  members: Record<number, Member[]>;
}
