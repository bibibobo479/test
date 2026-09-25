import type { Subtask, SubtaskPriority, SubtaskStatus } from "../types/subtask";

interface TaskCardProps {
  task: Subtask;
  currentUserId: number | null;
  currentUserRole: string | null;
  isLeader: boolean;

  onTake: (task: Subtask) => void;
  onRelease: (task: Subtask) => void;
  onStart: (task: Subtask) => void;
  onReview: (task: Subtask) => void;
  onAccept: (task: Subtask) => void;
  onBlock: (task: Subtask) => void;
  onUnblock: (task: Subtask) => void;
}

function getStatusName(status: SubtaskStatus) {
  switch (status) {
    case "todo":
      return "К выполнению";

    case "in_progress":
      return "В работе";

    case "review":
      return "На проверке";

    case "done":
      return "Готово";
  }
}

function getPriorityName(priority: SubtaskPriority) {
  switch (priority) {
    case "low":
      return "Низкий";

    case "normal":
      return "Обычный";

    case "high":
      return "Высокий";
  }
}

function formatDate(date: string | null) {
  if (!date) {
    return "Без срока";
  }

  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function TaskCard({
  task,
  currentUserId,
  currentUserRole,
  isLeader,

  onTake,
  onRelease,
  onStart,
  onReview,
  onAccept,
  onBlock,
  onUnblock,
}: TaskCardProps) {
  const isMyTask = task.student_id === currentUserId;

  const canManage = currentUserRole === "teacher" || isLeader;

  return (
    <article
      className={`task-card ${task.is_blocked ? "task-card-blocked" : ""}`}
    >
      <div className="task-card-top">
        <div>
          <div className="task-badges">
            <span className={`task-priority ` + `priority-${task.priority}`}>
              {getPriorityName(task.priority)}
            </span>

            {task.is_blocked && (
              <span className="blocked-badge">Заблокирована</span>
            )}
          </div>

          <h3>{task.title}</h3>
        </div>

        <span className={`task-status ` + `status-${task.status}`}>
          {getStatusName(task.status)}
        </span>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        <span>
          Дедлайн: <strong>{formatDate(task.deadline)}</strong>
        </span>

        <span>
          Исполнитель:{" "}
          <strong>
            {task.student_id ? `#${task.student_id}` : "не назначен"}
          </strong>
        </span>
      </div>

      {task.result && (
        <div className="task-result">
          <span>Результат</span>

          <p>{task.result}</p>
        </div>
      )}

      <div className="task-actions">
        {currentUserRole === "student" &&
          task.student_id === null &&
          !task.is_blocked && (
            <button onClick={() => onTake(task)}>Взять задачу</button>
          )}

        {currentUserRole === "student" &&
          isMyTask &&
          task.status === "todo" &&
          !task.is_blocked && (
            <button onClick={() => onStart(task)}>Начать работу</button>
          )}

        {currentUserRole === "student" &&
          isMyTask &&
          task.status === "in_progress" &&
          !task.is_blocked && (
            <button onClick={() => onReview(task)}>На проверку</button>
          )}

        {currentUserRole === "student" &&
          isMyTask &&
          task.status !== "done" && (
            <button
              className="secondary-button"
              onClick={() => onRelease(task)}
            >
              Освободить
            </button>
          )}

        {isLeader && task.status === "review" && !task.is_blocked && (
          <button onClick={() => onAccept(task)}>Принять</button>
        )}

        {canManage && !task.is_blocked && (
          <button className="secondary-button" onClick={() => onBlock(task)}>
            Заблокировать
          </button>
        )}

        {canManage && task.is_blocked && (
          <button className="secondary-button" onClick={() => onUnblock(task)}>
            Разблокировать
          </button>
        )}
      </div>
    </article>
  );
}
