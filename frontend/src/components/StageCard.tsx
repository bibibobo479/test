import type { Stage } from "../types/stage";
import type { Task } from "../types/task";

import { EpicCard } from "./EpicCard";
import { EntityIcon } from "../studio/ui";

interface StageCardProps {
  stage: Stage;
  epics: Task[];
}

function getStatusName(status: string) {
  switch (status) {
    case "planned":
      return "Запланирован";

    case "active":
      return "В работе";

    case "completed":
      return "Завершён";

    default:
      return status;
  }
}

function formatDate(date: string | null) {
  if (!date) {
    return "Не указана";
  }

  return new Date(date).toLocaleDateString("ru-RU");
}

export function StageCard({ stage, epics }: StageCardProps) {
  return (
    <article className="stage-card">
      <div className="stage-card-header">
        <div>
          <span className="stage-number">
            <EntityIcon entity="stage" size={16} /> Этап #{stage.id}
          </span>

          <h2>{stage.title}</h2>
        </div>

        <span className={`stage-status ${stage.status}`}>
          {getStatusName(stage.status)}
        </span>
      </div>

      {stage.description && (
        <p className="stage-description">{stage.description}</p>
      )}

      <div className="stage-info">
        <div>
          <span>Начало</span>

          <strong>{formatDate(stage.start_date)}</strong>
        </div>

        <div>
          <span>Дедлайн</span>

          <strong>{formatDate(stage.deadline)}</strong>
        </div>
      </div>

      <div className="stage-epics">
        <div className="stage-epics-header">
          <h3>
            <EntityIcon entity="epic" size={16} /> Эпики
          </h3>

          <span>{epics.length}</span>
        </div>

        {epics.length === 0 ? (
          <p className="empty-epics">В этом этапе пока нет эпиков.</p>
        ) : (
          <div className="epics-list">
            {epics.map((epic) => (
              <EpicCard key={epic.id} epic={epic} />
            ))}
          </div>
        )}
      </div>

      {stage.expected_result && (
        <div className="expected-result">
          <span>Ожидаемый результат</span>

          <p>{stage.expected_result}</p>
        </div>
      )}
    </article>
  );
}
