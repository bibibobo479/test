import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/api";
import {
  dateLabel,
  errorMessage,
  safeUrl,
  statusLabels,
  priorityLabels,
  useSession,
  useWorkspace,
} from "./state";
import type { Comment, History, Subtask } from "./types";
import {
  ActionForm,
  Avatar,
  Badge,
  Empty,
  EntityIcon,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Modal,
  PageHeader,
} from "./ui";
import { SubtaskForm } from "./Forms";
const columns = ["todo", "in_progress", "review", "done"] as const;
function TaskTile({ task }: { task: Subtask }) {
  const { data } = useWorkspace();
  const epic = data.epics.find((e) => e.id === task.task_id);
  const member = data.members[epic?.group_id || 0]?.find(
    (m) => m.id === task.student_id,
  );
  const overdue =
    !!task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "done";
  return (
    <Link
      className={`task-tile ${task.is_blocked ? "blocked" : ""}`}
      to={`/tasks/${task.id}`}
    >
      <div className="task-tile-top">
        <span className="card-kicker">
          ЗАДАЧА-{String(task.id).padStart(3, "0")}
        </span>
        <span className={`priority ${task.priority}`}>
          <i />
          {priorityLabels[task.priority] || "Не указан"}
        </span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <span className="epic-tag">
        <EntityIcon entity="epic" size={12} />
        {epic?.title}
      </span>
      {task.is_blocked && (
        <span className="blocked-label">
          <Icon name="lock" size={13} />
          Заблокирована
        </span>
      )}
      <div className="task-tile-bottom">
        <span className={overdue ? "overdue" : ""}>
          <Icon name="calendar" size={14} />
          {dateLabel(task.deadline)}
        </span>
        {member ? (
          <Avatar name={member.name} small />
        ) : task.student_id ? (
          <span
            className="assignee-placeholder"
            title={`Студент №${task.student_id}`}
          >
            #{task.student_id}
          </span>
        ) : (
          <span className="assignee-placeholder" title="Не назначена">
            <Icon name="people" size={15} />
          </span>
        )}
      </div>
    </Link>
  );
}
export function TaskBoard({
  mine = false,
  groupId,
  epicId,
  embedded = false,
}: {
  mine?: boolean;
  groupId?: number;
  epicId?: number;
  embedded?: boolean;
}) {
  const { data } = useWorkspace();
  const { user } = useSession();
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("all");
  const [priority, setPriority] = useState("all");
  const [view, setView] = useState("board");
  const [selectedEpic, setSelectedEpic] = useState("");
  const [create, setCreate] = useState(false);
  const [params, setParams] = useSearchParams();
  const statusFilter = columns.includes(
    params.get("status") as (typeof columns)[number],
  )
    ? params.get("status")!
    : "all";
  const epics = data.epics.filter(
    (e) =>
      (!groupId || e.group_id === groupId) &&
      (!epicId || e.id === epicId) &&
      (project === "all" || e.group_id === Number(project)),
  );
  const ids = new Set(epics.map((e) => e.id));
  const tasks = data.subtasks.filter(
    (t) =>
      ids.has(t.task_id) &&
      (!mine || t.student_id === user?.id) &&
      (statusFilter === "all" || t.status === statusFilter) &&
      (priority === "all" ||
        (priority === "blocked" ? t.is_blocked : t.priority === priority)) &&
      `${t.title} ${t.description || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const chosen = epics.find((e) => e.id === Number(selectedEpic)) || epics[0];
  const createButton = user?.role === "student" && !epicId && (
    <button
      className="btn primary"
      disabled={!epics.length}
      onClick={() => setCreate(true)}
    >
      <Icon name="plus" size={18} />
      Новая задача
    </button>
  );
  return (
    <>
      {!embedded ? (
        <PageHeader
          eyebrow={mine ? "СОСРЕДОТОЧЬТЕСЬ НА ВАЖНОМ" : "ОТ ИДЕИ ДО РЕЗУЛЬТАТА"}
          title={mine ? "Мои задачи" : "Доска задач"}
          description={
            mine
              ? "Ваши задачи и ближайшие шаги к результату."
              : "Все задачи команды: от планов до готового результата."
          }
          action={createButton}
        />
      ) : (
        <div className="section-heading">
          <h2>
            Задачи команды <span className="count-pill">{tasks.length}</span>
          </h2>
          {createButton}
        </div>
      )}
      <div className="toolbar board-toolbar">
        <div className="filter-group">
          <label className="search-input">
            <Icon name="search" size={17} />
            <input
              placeholder="Найти задачу…"
              aria-label="Поиск задач"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {!groupId && !epicId && (
            <select
              aria-label="Фильтр задач по проекту"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="all">Все проекты</option>
              {data.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Фильтр по приоритету"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">Все приоритеты</option>
            <option value="high">Высокий приоритет</option>
            <option value="normal">Обычный приоритет</option>
            <option value="low">Низкий приоритет</option>
            <option value="blocked">Только заблокированные</option>
          </select>
          <select
            aria-label="Фильтр по статусу"
            value={statusFilter}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value === "all") next.delete("status");
              else next.set("status", e.target.value);
              setParams(next);
            }}
          >
            <option value="all">Все статусы</option>
            {columns.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="view-toggle">
          <button
            aria-label="Вид доской"
            aria-pressed={view === "board"}
            className={view === "board" ? "selected" : ""}
            onClick={() => setView("board")}
          >
            <Icon name="board" size={17} />
          </button>
          <button
            aria-label="Вид списком"
            aria-pressed={view === "list"}
            className={view === "list" ? "selected" : ""}
            onClick={() => setView("list")}
          >
            <Icon name="tasks" size={17} />
          </button>
        </div>
      </div>
      {!tasks.length && (
        <div className="board-empty-note">
          <Icon name="spark" size={17} />
          {query || priority !== "all" || statusFilter !== "all"
            ? "Задачи не найдены. Попробуйте изменить фильтры."
            : mine
              ? "Возьмите задачу с доски команды — она появится здесь."
              : "Добавьте задачу в эпик, чтобы начать работу."}
        </div>
      )}
      {view === "board" ? (
        <div className="kanban">
          {columns.map((status) => (
            <section className={`kanban-column ${status}`} key={status}>
              <div className="column-heading">
                <h3>
                  <i />
                  {statusLabels[status]}
                  <span>{tasks.filter((t) => t.status === status).length}</span>
                </h3>
                <Icon
                  name={
                    status === "done"
                      ? "check"
                      : status === "review"
                        ? "message"
                        : "tasks"
                  }
                  size={16}
                />
              </div>
              <div className="column-body">
                {tasks
                  .filter((t) => t.status === status)
                  .map((t) => (
                    <TaskTile key={t.id} task={t} />
                  ))}
                {!tasks.some((t) => t.status === status) && (
                  <div className="column-empty">
                    {status === "done"
                      ? "Здесь появятся выполненные задачи."
                      : "Задач в этом статусе пока нет."}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="panel task-list">
          {tasks.length ? (
            tasks.map((t) => (
              <Link key={t.id} className="task-list-row" to={`/tasks/${t.id}`}>
                <span className="mono muted">#{t.id}</span>
                <div>
                  <strong>{t.title}</strong>
                  <small>
                    <EntityIcon entity="epic" size={12} />
                    {data.epics.find((e) => e.id === t.task_id)?.title}
                  </small>
                </div>
                <Badge status={t.status} />
                {t.is_blocked && <Icon name="lock" size={16} />}
                <span className={`priority ${t.priority}`}>
                  {priorityLabels[t.priority] || "Не указан"}
                </span>
                <span className="row-date">{dateLabel(t.deadline)}</span>
                <Icon name="chevron" size={16} />
              </Link>
            ))
          ) : (
            <Empty title="Задач пока нет">
              Измените фильтры или возьмите задачу с доски команды.
            </Empty>
          )}
        </div>
      )}
      {create && chosen && (
        <Modal
          title="Выберите эпик для задачи"
          subtitle="Задача будет добавлена в выбранный эпик."
          onClose={() => setCreate(false)}
        >
          <div className="epic-picker">
            <Field label="Эпик">
              <select
                value={chosen.id}
                onChange={(e) => setSelectedEpic(e.target.value)}
              >
                {epics.map((e) => (
                  <option key={e.id} value={e.id}>
                    {data.groups.find((g) => g.id === e.group_id)?.name} /{" "}
                    {e.title}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="btn primary"
              onClick={() => {
                setCreate(false);
                setSelectedEpic(`create:${chosen.id}`);
              }}
            >
              Продолжить <Icon name="arrow" size={17} />
            </button>
          </div>
        </Modal>
      )}
      {selectedEpic.startsWith("create:") &&
        data.epics.find((e) => e.id === Number(selectedEpic.slice(7))) && (
          <SubtaskForm
            epic={
              data.epics.find((e) => e.id === Number(selectedEpic.slice(7)))!
            }
            onClose={() => setSelectedEpic("")}
          />
        )}
    </>
  );
}
export function TaskDetail() {
  const { taskId } = useParams();
  return <TaskDetailContent key={taskId} />;
}
function TaskDetailContent() {
  const { taskId } = useParams();
  const { data, refresh, refreshing, notify } = useWorkspace();
  const { user } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [tab, setTab] = useState("comments");
  const [comment, setComment] = useState("");
  const task = data.subtasks.find((t) => t.id === Number(taskId));
  const epic = data.epics.find((e) => e.id === task?.task_id);
  const members = data.members[epic?.group_id || 0] || [];
  const leader = members.some((m) => m.id === user?.id && m.is_leader);
  const manager = user?.role === "teacher" || leader;
  const assignee = task?.student_id === user?.id;
  const student = user?.role === "student";
  useEffect(() => {
    let live = true;
    Promise.all([
      api.get<Comment[]>(`/subtasks/${taskId}/comments`),
      api.get<History[]>(`/subtasks/${taskId}/history`),
    ])
      .then(([c, h]) => {
        if (live) {
          setComments(c.data);
          setHistory(h.data);
          setLoadError("");
        }
      })
      .catch((e) => {
        if (live) setLoadError(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [taskId, version]);
  const actor = (id: number) =>
    id === user?.id
      ? user.name
      : members.find((m) => m.id === id)?.name ||
        (id === epic?.teacher_id ? "Преподаватель" : `Участник №${id}`);
  async function action(path: string, payload?: object) {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/subtasks/${taskId}/${path}`, payload);
      refresh();
      setVersion((v) => v + 1);
      notify("Задача обновлена.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/subtasks/${taskId}/comments`, { text: comment.trim() });
      setComment("");
      setVersion((v) => v + 1);
      notify("Комментарий добавлен.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!task || !epic)
    return (
      <Empty
        title="Задача недоступна"
        action={
          <Link className="btn primary" to="/board">
            К доске задач
          </Link>
        }
      >
        Возможно, задача была удалена или у вас нет доступа к ней.
      </Empty>
    );
  const actionDisabled = busy || refreshing;
  return (
    <>
      <Link className="back-link" to={`/epics/${epic.id}`}>
        <Icon name="back" size={16} />
        {epic.title}
      </Link>
      <PageHeader
        entity="task"
        eyebrow={`ЗАДАЧА-${String(task.id).padStart(3, "0")}`}
        title={task.title}
        description={
          data.groups.find((g) => g.id === epic.group_id)?.name || ""
        }
        action={<Badge status={task.status} />}
      />
      {error && <ErrorBox message={error} />}
      <div className="task-detail-grid">
        <div>
          <section className="panel task-description">
            <div className="panel-heading">
              <h2>Описание задачи</h2>
              <Icon name="tasks" size={19} />
            </div>
            <p className="description-text">
              {task.description ||
                "Описание пока не добавлено. Подробности можно обсудить с командой в комментариях."}
            </p>
            {task.result && (
              <div className="result-box">
                <div className="eyebrow">РЕЗУЛЬТАТ РАБОТЫ</div>
                <p>{task.result}</p>
                {safeUrl(task.external_url) && (
                  <a
                    className="text-link"
                    target="_blank"
                    rel="noreferrer"
                    href={safeUrl(task.external_url)}
                  >
                    Посмотреть результат <Icon name="arrow" size={16} />
                  </a>
                )}
              </div>
            )}
            {task.is_blocked && (
              <div className="info-note warning">
                <Icon name="lock" size={18} />
                Задача заблокирована. Разблокировать её может преподаватель или
                главный студент.
              </div>
            )}
            <div className="task-actions">
              {student && !task.is_blocked && (
                <>
                  {task.student_id === null && epic.student_id === null && (
                    <button
                      className="btn primary"
                      disabled={actionDisabled}
                      onClick={() => void action("take")}
                    >
                      <Icon name="plus" size={17} />
                      Взять задачу
                    </button>
                  )}
                  {assignee && task.status === "todo" && (
                    <button
                      className="btn primary"
                      disabled={actionDisabled}
                      onClick={() =>
                        void action("status", { status: "in_progress" })
                      }
                    >
                      Начать работу <Icon name="arrow" size={17} />
                    </button>
                  )}
                  {assignee && task.status === "in_progress" && (
                    <button
                      className="btn primary"
                      disabled={actionDisabled}
                      onClick={() => setReview(true)}
                    >
                      Отправить на проверку <Icon name="arrow" size={17} />
                    </button>
                  )}
                  {leader && task.status === "review" && (
                    <button
                      className="btn primary"
                      disabled={actionDisabled}
                      onClick={() => void action("status", { status: "done" })}
                    >
                      <Icon name="check" size={17} />
                      Принять задачу
                    </button>
                  )}
                  {assignee &&
                    epic.student_id === null &&
                    ["todo", "in_progress"].includes(task.status) && (
                      <button
                        className="btn secondary"
                        disabled={actionDisabled}
                        onClick={() => void action("release")}
                      >
                        Освободить задачу
                      </button>
                    )}
                </>
              )}
              {manager && (
                <button
                  className="btn secondary"
                  disabled={actionDisabled}
                  onClick={() =>
                    void action(task.is_blocked ? "unblock" : "block")
                  }
                >
                  <Icon name="lock" size={16} />
                  {task.is_blocked ? "Разблокировать" : "Заблокировать"}
                </button>
              )}
            </div>
            {task.status === "review" && !leader && (
              <p className="muted helper-text">
                Главный студент проекта сможет принять задачу после проверки
                результата.
              </p>
            )}
          </section>
          <section className="panel discussion">
            <div className="tabs discussion-tabs">
              <button
                className={tab === "comments" ? "selected" : ""}
                onClick={() => setTab("comments")}
              >
                <Icon name="message" size={16} />
                Обсуждение <span>{comments.length}</span>
              </button>
              <button
                className={tab === "history" ? "selected" : ""}
                onClick={() => setTab("history")}
              >
                <Icon name="clock" size={16} />
                История
              </button>
            </div>
            {loadError && (
              <ErrorBox
                message={loadError}
                retry={() => setVersion((v) => v + 1)}
              />
            )}{" "}
            {loading ? (
              <Loading />
            ) : tab === "comments" ? (
              <>
                <div className="comment-list">
                  {comments.length ? (
                    comments.map((c) => (
                      <div className="comment" key={c.id}>
                        <Avatar name={actor(c.author_id)} small />
                        <div>
                          <div className="comment-meta">
                            <strong>{actor(c.author_id)}</strong>
                            <time>
                              {new Date(c.created_at).toLocaleString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                          <p>{c.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="quiet-empty">
                      <Icon name="message" size={23} />
                      <h3>Обсудим задачу?</h3>
                      <p>
                        Задайте вопрос, поделитесь идеей или оставьте отзыв.
                      </p>
                    </div>
                  )}
                </div>
                <form className="comment-form" onSubmit={postComment}>
                  <Avatar name={user!.name} small />
                  <div>
                    <textarea
                      aria-label="Написать комментарий"
                      placeholder="Добавьте комментарий…"
                      maxLength={2000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                      rows={3}
                    />
                    <div>
                      <small>{comment.length} / 2000</small>
                      <button
                        className="btn primary compact"
                        disabled={busy || !comment.trim()}
                      >
                        Отправить <Icon name="arrow" size={15} />
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="activity-list">
                {history.length ? (
                  [...history].reverse().map((h) => (
                    <div className="activity-row" key={h.id}>
                      <span className="activity-dot" />
                      <div>
                        <p>
                          <strong>{actor(h.user_id)}</strong>{" "}
                          {(
                            {
                              created: "— создание задачи",
                              taken: "— задача взята в работу",
                              released: "— задача освобождена",
                              status_changed: "— изменение статуса",
                              accepted: "— результат принят",
                              blocked: "— задача заблокирована",
                              unblocked: "— задача разблокирована",
                            } as Record<string, string>
                          )[h.action] || "— задача изменена"}
                        </p>
                        {["status_changed", "accepted"].includes(h.action) && (
                          <span className="activity-values">
                            {statusLabels[h.old_value || ""] || "Не указан"}{" "}
                            <Icon name="arrow" size={12} />{" "}
                            {statusLabels[h.new_value || ""] || "Не указан"}
                          </span>
                        )}
                        <small>
                          {new Date(h.created_at).toLocaleString("ru-RU")}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="quiet-empty">
                    <p>История изменений пока пуста.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
        <aside className="task-properties panel">
          <div className="panel-heading">
            <h2>Подробности</h2>
          </div>
          <dl>
            <div>
              <dt>Статус</dt>
              <dd>
                <Badge status={task.status} />
              </dd>
            </div>
            <div>
              <dt>Приоритет</dt>
              <dd>
                <span className={`priority ${task.priority}`}>
                  <i />
                  {priorityLabels[task.priority] || "Не указан"}
                </span>
              </dd>
            </div>
            <div>
              <dt>Исполнитель</dt>
              <dd>
                {task.student_id ? (
                  <>
                    <Avatar name={actor(task.student_id)} small />
                    {actor(task.student_id)}
                  </>
                ) : (
                  "Не назначен"
                )}
              </dd>
            </div>
            <div>
              <dt>Срок выполнения</dt>
              <dd>
                <Icon name="calendar" size={16} />
                {dateLabel(task.deadline, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt>Эпик</dt>
              <dd>
                <Link className="text-link" to={`/epics/${epic.id}`}>
                  <EntityIcon entity="epic" size={15} />
                  {epic.title}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Автор</dt>
              <dd>{actor(task.created_by_id)}</dd>
            </div>
            <div>
              <dt>Дата создания</dt>
              <dd>
                {dateLabel(task.created_at, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
          <div className="task-tip">
            <Icon name="spark" size={23} />
            <p>Делитесь прогрессом, чтобы команда была в курсе.</p>
          </div>
        </aside>
      </div>
      {review && (
        <Modal
          title="Отправить на проверку"
          subtitle="Опишите результат работы для проверки главным студентом."
          onClose={() => setReview(false)}
        >
          <ActionForm
            label="Отправить на проверку"
            onClose={() => setReview(false)}
            submit={async (form) => {
              const result = String(form.get("result") || "").trim();
              if (!result)
                throw new Error("Перед отправкой опишите результат работы.");
              await api.patch(`/subtasks/${task.id}/status`, {
                status: "review",
                result,
                external_url:
                  String(form.get("external_url") || "").trim() || null,
              });
              refresh();
              setVersion((v) => v + 1);
              notify("Задача отправлена на проверку.");
            }}
          >
            <Field label="Результат работы">
              <textarea
                name="result"
                rows={5}
                required
                autoFocus
                placeholder="Опишите, что сделано и на что обратить внимание при проверке."
              />
            </Field>
            <Field label="Ссылка на результат (необязательно)">
              <input
                name="external_url"
                type="url"
                maxLength={500}
                placeholder="https://…"
              />
            </Field>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
