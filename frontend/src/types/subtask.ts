export type SubtaskStatus =
| "todo"
| "in_progress"
| "review"
| "done";

export type SubtaskPriority =
| "low"
| "normal"
| "high";

export interface Subtask {
    id: number;

    title: string;
    description: string | null;

    status: SubtaskStatus;
    is_blocked: boolean;

    deadline: string | null;
    priority: SubtaskPriority;

    result: string | null;
    external_url: string | null;

    task_id: number;

    student_id: number | null;
    created_by_id: number;

    created_at: string;
}
