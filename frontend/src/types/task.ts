export interface Task {
    id: number;
    title: string;
    description: string;
    deadline: string;
    max_score: number;
    status: string;
    group_id: number;
    teacher_id: number;
    student_id: number | null;
    stage_id: number | null;
}
