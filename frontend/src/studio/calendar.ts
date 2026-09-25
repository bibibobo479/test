import type { Subtask } from "./types";

/** Calendar keys follow local time, like the datetime-local task forms. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dayDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function moveMonth(date: Date, offset: number): Date {
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + offset + 1,
    0,
  ).getDate();
  return new Date(
    date.getFullYear(),
    date.getMonth() + offset,
    Math.min(date.getDate(), lastDay),
    12,
  );
}

export function monthDays(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        first.getFullYear(),
        first.getMonth(),
        1 - mondayOffset + index,
        12,
      ),
  );
}

export function ownDeadlines(
  tasks: Subtask[],
  userId: number,
  showCompleted: boolean,
): Map<string, Subtask[]> {
  const days = new Map<string, Subtask[]>();
  for (const task of tasks) {
    if (
      task.student_id !== userId ||
      !task.deadline ||
      (!showCompleted && task.status === "done")
    )
      continue;
    const date = new Date(task.deadline);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    days.set(key, [...(days.get(key) || []), task]);
  }
  for (const tasks of days.values()) {
    tasks.sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime() ||
        a.id - b.id,
    );
  }
  return days;
}
