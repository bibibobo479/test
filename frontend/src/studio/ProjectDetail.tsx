import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "../api/api";
import { dateLabel, errorMessage, useSession, useWorkspace } from "./state";
import type { Group, Member, Stage } from "./types";
import {
  Avatar,
  Badge,
  Confirm,
  Empty,
  EntityIcon,
  ErrorBox,
  Icon,
  PageHeader,
  Progress,
} from "./ui";
import { AddMemberForm, EpicForm, StageForm, SubtaskForm } from "./Forms";
import { TaskBoard } from "./Tasks";
function StageSection({
  stage,
  group,
  index,
}: {
  stage: Stage;
  group: Group;
  index: number;
}) {
  const { data, refresh, notify } = useWorkspace();
  const { user } = useSession();
  const teacher = user?.role === "teacher";
  const [edit, setEdit] = useState(false);
  const [create, setCreate] = useState(false);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const epics = data.epics.filter((e) => e.stage_id === stage.id);
  async function setStatus(status: string) {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/stages/${stage.id}/status`, { status });
      refresh();
      notify("Статус этапа обновлён.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stage-section">
      <div className="stage-heading">
        <span className="stage-number">
          <EntityIcon entity="stage" size={21} />
        </span>
        <div>
          <div className="stage-title">
            <h2>
              <span className="stage-order">
                {String(index + 1).padStart(2, "0")}
              </span>
              {stage.title}
            </h2>
            <Badge status={stage.status} />
          </div>
          <p>{stage.description || "Ещё один шаг к общей цели."}</p>
        </div>
        {teacher && (
          <div className="stage-actions">
            <select
              aria-label={`Статус этапа «${stage.title}»`}
              value={stage.status}
              disabled={busy}
              onChange={(e) => void setStatus(e.target.value)}
            >
              <option value="planned">Запланирован</option>
              <option value="active">В работе</option>
              <option value="completed">Завершён</option>
            </select>
            <button
              className="btn secondary compact"
              onClick={() => setEdit(true)}
            >
              Изменить
            </button>
            <button
              className="icon-button"
              aria-label={`Удалить ${stage.title}`}
              title={
                epics.length
                  ? "Нельзя удалить этап, пока в нём есть эпики"
                  : "Удалить этап"
              }
              disabled={epics.length > 0}
              onClick={() => setRemove(true)}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        )}
      </div>
      {error && <ErrorBox message={error} />}
      <div className="stage-info">
        <span>
          <Icon name="calendar" size={15} />
          {stage.start_date ? `${dateLabel(stage.start_date)} → ` : ""}
          {dateLabel(stage.deadline)}
        </span>
        {stage.expected_result && (
          <span>
            <Icon name="spark" size={15} />
            {stage.expected_result}
          </span>
        )}
      </div>
      <div className="epic-grid">
        {epics.map((epic) => {
          const tasks = data.subtasks.filter((t) => t.task_id === epic.id);
          const done = tasks.filter((t) => t.status === "done").length;
          return (
            <Link to={`/epics/${epic.id}`} className="epic-card" key={epic.id}>
              <div className="epic-card-top">
                <span className="card-kicker">
                  <EntityIcon entity="epic" size={15} />
                  ЭПИК-{String(epic.id).padStart(3, "0")}
                </span>
                <Icon name="arrow" size={17} />
              </div>
              <h3>{epic.title}</h3>
              <p>{epic.description}</p>
              <Progress
                value={tasks.length ? (done / tasks.length) * 100 : 0}
              />
              <div className="epic-card-bottom">
                <span>
                  {done}/{tasks.length} задач
                </span>
                <span>
                  <Icon name="calendar" size={14} />
                  {dateLabel(epic.deadline)}
                </span>
              </div>
            </Link>
          );
        })}
        {teacher && (
          <button className="add-epic-card" onClick={() => setCreate(true)}>
            <EntityIcon entity="epic" size={23} />
            <strong>Добавить эпик</strong>
            <span>Определите основные цели этапа</span>
          </button>
        )}
        {!teacher && !epics.length && (
          <p className="muted">
            Преподаватель ещё не добавил эпики в этот этап.
          </p>
        )}
      </div>
      {edit && (
        <StageForm group={group} stage={stage} onClose={() => setEdit(false)} />
      )}{" "}
      {create && (
        <EpicForm
          group={group}
          stage={stage}
          onClose={() => setCreate(false)}
        />
      )}{" "}
      {remove && (
        <Confirm
          title="Удалить этап?"
          onClose={() => setRemove(false)}
          action={async () => {
            await api.delete(`/stages/${stage.id}`);
            refresh();
            notify("Этап удалён.");
          }}
        >
          «{stage.title}» будет удалён без возможности восстановления.
        </Confirm>
      )}
    </section>
  );
}
export function ProjectDetail() {
  const { projectId } = useParams();

  const { data, refresh, notify } = useWorkspace();

  const { user } = useSession();

  const navigate = useNavigate();

  const [params, setParams] = useSearchParams();

  const [stageForm, setStageForm] = useState(false);

  const [memberForm, setMemberForm] = useState(false);

  const [remove, setRemove] = useState(false);

  const [removeMember, setRemoveMember] = useState<Member | null>(null);

  const group = data.groups.find((g) => g.id === Number(projectId));

  const teacher = user?.role === "teacher";

  const tab = params.get("tab") || "stages";

  /*
   * Если проект не найден
   */

  if (!group) {
    return (
      <Empty
        title="Проект недоступен"
        action={
          <Link className="btn primary" to="/projects">
            Все проекты
          </Link>
        }
      >
        Возможно, проект был удалён или у вас нет к нему доступа.
      </Empty>
    );
  }

  /*
   * Этапы текущего проекта
   */

  const stages = data.stages.filter((stage) => stage.group_id === group.id);

  /*
   * Участники текущего проекта
   */

  const members = data.members[group.id] || [];

  /*
   * Эпики текущего проекта
   */

  const epics = data.epics.filter((epic) => epic.group_id === group.id);

  /*
   * ID всех эпиков текущего проекта.
   *
   * Subtask хранит task_id,
   * который указывает на Epic.
   */

  const epicIds = new Set(epics.map((epic) => epic.id));

  /*
   * Обычные задачи текущего проекта.
   *
   * Берём только те Subtask,
   * которые принадлежат Epic
   * текущего проекта.
   */

  const projectTasks = data.subtasks.filter((task) =>
    epicIds.has(task.task_id),
  );

  return (
    <>
      {/* Назад к проектам */}

      <Link className="back-link" to="/projects">
        <Icon name="back" size={16} />
        Все проекты
      </Link>

      {/* Заголовок проекта */}

      <PageHeader
        entity="project"
        eyebrow={`ПРОЕКТ / ${String(group.id).padStart(2, "0")}`}
        title={group.name}
        description="Общая цель команды и понятный путь к результату."
        action={
          teacher ? (
            <button className="btn primary" onClick={() => setStageForm(true)}>
              <Icon name="plus" size={18} />
              Добавить этап
            </button>
          ) : undefined
        }
      />

      {/* Навигация + статистика */}

      <div className="project-summary">
        {/* Этапы */}

        {/* Эпики */}

        <button
          type="button"
          className={`project-summary-item ${
            tab === "stages" ? "selected" : ""
          }`}
          onClick={() =>
            setParams({
              tab: "stages",
            })
          }
        >
          <EntityIcon entity="epic" size={18} />

          <span>
            <strong>{epics.length}</strong>

            <small>Эпики</small>
          </span>
        </button>

        {/* Доска задач */}

        <button
          type="button"
          className={`project-summary-item ${
            tab === "board" ? "selected" : ""
          }`}
          onClick={() =>
            setParams({
              tab: "board",
            })
          }
        >
          <Icon name="board" size={18} />

          <span>
            <strong>{projectTasks.length}</strong>

            <small>Доска задач</small>
          </span>
        </button>

        {/* Команда */}

        <button
          type="button"
          className={`project-summary-item ${tab === "team" ? "selected" : ""}`}
          onClick={() =>
            setParams({
              tab: "team",
            })
          }
        >
          <Icon name="people" size={18} />

          <span>
            <strong>{members.length}</strong>

            <small>Участники</small>
          </span>
        </button>

        {/* Код приглашения */}

        <div className="invite-code">
          <span>Код приглашения</span>

          <strong className="mono">{group.invite_code}</strong>

          <button
            type="button"
            className="icon-button"
            aria-label="Скопировать код приглашения"
            title="Скопировать код приглашения"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(group.invite_code);

                notify("Код приглашения скопирован.");
              } catch {
                notify(`Код приглашения: ${group.invite_code}`);
              }
            }}
          >
            <Icon name="copy" size={16} />
          </button>
        </div>

        {/* Удаление проекта */}

        {teacher && (
          <button
            type="button"
            className="project-summary-delete"
            onClick={() => setRemove(true)}
          >
            <Icon name="trash" size={17} />
            Удалить проект
          </button>
        )}
      </div>

      {/* ========================= */}
      {/* ЭТАПЫ */}
      {/* ========================= */}

      {tab === "stages" &&
        (stages.length ? (
          <div className="stage-list">
            {stages.map((stage, index) => (
              <StageSection
                key={stage.id}
                group={group}
                stage={stage}
                index={index}
              />
            ))}
          </div>
        ) : (
          <Empty
            title="У проекта пока нет этапов"
            action={
              teacher ? (
                <button
                  className="btn primary"
                  onClick={() => setStageForm(true)}
                >
                  <Icon name="plus" size={17} />
                  Создать первый этап
                </button>
              ) : undefined
            }
          >
            {teacher
              ? "Добавьте этап, определите ожидаемый результат, а затем разбейте работу на эпики."
              : "Руководитель проекта добавит этапы работы здесь."}
          </Empty>
        ))}

      {/* ========================= */}
      {/* ДОСКА ЗАДАЧ */}
      {/* ========================= */}

      {tab === "board" && <TaskBoard groupId={group.id} embedded />}

      {/* ========================= */}
      {/* КОМАНДА */}
      {/* ========================= */}

      {tab === "team" && (
        <section className="panel">
          <div className="panel-heading">
            <h2>
              Участники проекта{" "}
              <span className="count-pill">{members.length}</span>
            </h2>

            {teacher && (
              <button
                className="btn secondary compact"
                onClick={() => setMemberForm(true)}
              >
                <Icon name="plus" size={16} />
                Добавить студента
              </button>
            )}
          </div>

          {members.length ? (
            members.map((member) => (
              <div className="member-row" key={member.id}>
                <Avatar name={member.name} />

                <div>
                  <strong>
                    {member.name}

                    {member.id === user?.id && <small> (вы)</small>}
                  </strong>

                  <p>{member.email}</p>
                </div>

                <span
                  className={`badge ${member.is_leader ? "active" : "planned"}`}
                >
                  {member.is_leader ? "Главный студент" : "Студент"}
                </span>

                <span className="muted mono">#{member.id}</span>

                {teacher && (
                  <button
                    className="icon-button danger-text"
                    aria-label={`Удалить ${member.name}`}
                    title="Удалить участника"
                    onClick={() => setRemoveMember(member)}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <Empty title="Команда пока не собрана">
              Передайте студентам код приглашения, чтобы они могли
              присоединиться к проекту.
            </Empty>
          )}

          <div className="info-note">
            ID вашей учётной записи: <strong>#{user?.id}</strong>. Преподаватель
            может использовать этот ID, чтобы добавить вас в проект.
          </div>
        </section>
      )}

      {/* ========================= */}
      {/* ФОРМА СОЗДАНИЯ ЭТАПА */}
      {/* ========================= */}

      {stageForm && (
        <StageForm group={group} onClose={() => setStageForm(false)} />
      )}

      {/* ========================= */}
      {/* ДОБАВЛЕНИЕ УЧАСТНИКА */}
      {/* ========================= */}

      {memberForm && (
        <AddMemberForm group={group} onClose={() => setMemberForm(false)} />
      )}

      {/* ========================= */}
      {/* УДАЛЕНИЕ ПРОЕКТА */}
      {/* ========================= */}

      {remove && (
        <Confirm
          title="Удалить проект?"
          onClose={() => setRemove(false)}
          action={async () => {
            await api.delete(`/groups/${group.id}`);

            refresh();

            notify("Проект удалён.");

            navigate("/projects");
          }}
        >
          Проект «{group.name}» и связанные с ним данные будут удалены. Это
          действие нельзя отменить.
        </Confirm>
      )}

      {/* ========================= */}
      {/* УДАЛЕНИЕ УЧАСТНИКА */}
      {/* ========================= */}

      {removeMember && (
        <Confirm
          title="Удалить участника из проекта?"
          onClose={() => setRemoveMember(null)}
          action={async () => {
            await api.delete(`/groups/${group.id}/students/${removeMember.id}`);

            refresh();

            notify("Участник удалён из проекта.");
          }}
        >
          {removeMember.name} потеряет доступ к этому проекту.
        </Confirm>
      )}
    </>
  );
}
export function EpicDetail() {
  const { epicId } = useParams();
  const { data } = useWorkspace();
  const { user } = useSession();
  const [create, setCreate] = useState(false);
  const epic = data.epics.find((e) => e.id === Number(epicId));
  if (!epic)
    return (
      <Empty
        title="Эпик недоступен"
        action={
          <Link className="btn primary" to="/projects">
            Все проекты
          </Link>
        }
      >
        Возможно, эпик был удалён или у вас нет доступа к нему.
      </Empty>
    );
  const group = data.groups.find((g) => g.id === epic.group_id);
  const stage = data.stages.find((s) => s.id === epic.stage_id);
  const tasks = data.subtasks.filter((t) => t.task_id === epic.id);
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <>
      <Link className="back-link" to={`/projects/${epic.group_id}`}>
        <Icon name="back" size={16} />
        {group?.name || "Назад к проекту"}
      </Link>
      <PageHeader
        entity="epic"
        eyebrow={`ЭПИК-${String(epic.id).padStart(3, "0")} / ${stage?.title || "ПРОЕКТ"}`}
        title={epic.title}
        description={epic.description}
        action={
          user?.role === "student" ? (
            <button className="btn primary" onClick={() => setCreate(true)}>
              <Icon name="plus" size={18} />
              Новая задача
            </button>
          ) : undefined
        }
      />
      <div className="epic-metrics">
        {stage && (
          <div>
            <span>Этап</span>
            <strong>
              <EntityIcon entity="stage" size={17} />
              {stage.title}
            </strong>
          </div>
        )}
        <div>
          <span>Срок выполнения</span>
          <strong>
            <Icon name="calendar" size={17} />
            {dateLabel(epic.deadline, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </strong>
        </div>
        <div>
          <span>Максимальный балл</span>
          <strong>{epic.max_score} баллов</strong>
        </div>
        <div>
          <span>Исполнитель</span>
          <strong>
            {epic.student_id
              ? data.members[epic.group_id]?.find(
                  (m) => m.id === epic.student_id,
                )?.name || `Студент №${epic.student_id}`
              : "Вся команда"}
          </strong>
        </div>
        <div>
          <span>Выполнение</span>
          <strong>
            {done} / {tasks.length} задач
          </strong>
          <Progress value={tasks.length ? (done / tasks.length) * 100 : 0} />
        </div>
      </div>
      <TaskBoard epicId={epic.id} embedded />
      {create && <SubtaskForm epic={epic} onClose={() => setCreate(false)} />}
    </>
  );
}
