import { useNavigate } from "react-router-dom";

import type { Task } from "../types/task";
import { EntityIcon } from "../studio/ui";

interface EpicCardProps {
  epic: Task;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusName(status: string) {
  switch (status) {
    case "todo":
      return "К выполнению";

    case "in_progress":
      return "В работе";

    case "review":
      return "На проверке";

    case "done":
      return "Готово";

    default:
      return status;
  }
}

export function EpicCard({ epic }: EpicCardProps) {
  const navigate = useNavigate();

  function openEpic() {
    navigate(`/epics/${epic.id}`);
  }

  return (
    <article className="epic-card" onClick={openEpic}>
      <div className="epic-header">
        <div>
          <span className="epic-label">
            <EntityIcon entity="epic" size={16} /> ЭПИК #{epic.id}
          </span>

          <h3>{epic.title}</h3>
        </div>

        <span className="epic-status">{getStatusName(epic.status)}</span>
      </div>

      <p className="epic-description">{epic.description}</p>

      <div className="epic-footer">
        <span>Дедлайн</span>

        <strong>{formatDate(epic.deadline)}</strong>
      </div>
    </article>
  );
}
