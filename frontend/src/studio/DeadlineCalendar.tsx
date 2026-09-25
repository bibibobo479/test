import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import {
  dayDate,
  dayKey,
  monthDays,
  moveMonth,
  ownDeadlines,
} from "./calendar";
import { useSession, useWorkspace } from "./state";
import { Badge, EntityIcon, Icon } from "./ui";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function DeadlineCalendar() {
  const { data } = useWorkspace();
  const { user } = useSession();
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [showCompleted, setShowCompleted] = useState(true);
  const grid = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedDate = dayDate(selected);
  const today = dayKey(now);
  const days = monthDays(selectedDate);
  const deadlines = ownDeadlines(data.subtasks, user!.id, showCompleted);
  const selectedTasks = deadlines.get(selected) || [];
  const monthPrefix = selected.slice(0, 7);
  const monthTotal = [...deadlines.entries()].reduce(
    (count, [key, tasks]) =>
      count + (key.startsWith(monthPrefix) ? tasks.length : 0),
    0,
  );
  const withoutDeadline = data.subtasks.filter(
    (t) =>
      t.student_id === user?.id &&
      !t.deadline &&
      (showCompleted || t.status !== "done"),
  ).length;
  const monthLabel = selectedDate.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  function navigateKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    date: Date,
  ) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next: Date;
    if (event.key in offsets) {
      next = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + offsets[event.key],
        12,
      );
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      next = moveMonth(date, event.key === "PageUp" ? -1 : 1);
    } else if (event.key === "Home" || event.key === "End") {
      const weekday = (date.getDay() + 6) % 7;
      next = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - weekday + (event.key === "End" ? 6 : 0),
        12,
      );
    } else return;
    event.preventDefault();
    const key = dayKey(next);
    setSelected(key);
    requestAnimationFrame(() =>
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${key}"]`)
        ?.focus(),
    );
  }

  return (
    <section
      className="deadline-calendar panel"
      aria-labelledby="deadline-calendar-title"
    >
      <div className="calendar-heading">
        <div>
          <div className="eyebrow">ВАШ РАБОЧИЙ РИТМ</div>
          <h2 id="deadline-calendar-title">
            <Icon name="calendar" size={21} />
            Календарь дедлайнов
          </h2>
          <p>
            Задачи, назначенные вам. Выберите день, чтобы посмотреть
            подробности.
          </p>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Показывать выполненные
        </label>
      </div>
      <div className="calendar-layout">
        <div className="calendar-month">
          <div className="calendar-toolbar">
            <h3 aria-live="polite">{monthLabel}</h3>
            <div>
              <button
                className="btn secondary compact"
                onClick={() => {
                  const current = new Date();
                  setNow(current);
                  setSelected(dayKey(current));
                }}
              >
                Сегодня
              </button>
              <button
                className="icon-button"
                aria-label="Предыдущий месяц"
                onClick={() => setSelected(dayKey(moveMonth(selectedDate, -1)))}
              >
                <Icon name="back" size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Следующий месяц"
                onClick={() => setSelected(dayKey(moveMonth(selectedDate, 1)))}
              >
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
          <table
            className="calendar-grid"
            ref={grid}
            aria-label={`Дедлайны: ${monthLabel}`}
          >
            <thead>
              <tr>
                {weekdays.map((day) => (
                  <th scope="col" key={day}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, week) => (
                <tr key={week}>
                  {days.slice(week * 7, week * 7 + 7).map((date) => {
                    const key = dayKey(date);
                    const tasks = deadlines.get(key) || [];
                    const isOutside =
                      date.getMonth() !== selectedDate.getMonth();
                    return (
                      <td key={key}>
                        <button
                          type="button"
                          data-day={key}
                          className={`calendar-day ${isOutside ? "outside" : ""} ${key === selected ? "selected" : ""} ${key === today ? "today" : ""}`}
                          aria-pressed={key === selected}
                          aria-current={key === today ? "date" : undefined}
                          aria-label={`${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}. Задач: ${tasks.length}`}
                          tabIndex={key === selected ? 0 : -1}
                          onClick={() => setSelected(key)}
                          onKeyDown={(event) => navigateKeyboard(event, date)}
                        >
                          <span className="calendar-day-number">
                            {date.getDate()}
                            {tasks.length > 0 && <small>{tasks.length}</small>}
                          </span>
                          <span className="calendar-day-tasks">
                            {tasks.slice(0, 2).map((task) => (
                              <span
                                key={task.id}
                                className={`calendar-task-preview ${task.status === "done" ? "completed" : new Date(task.deadline!) < now ? "late" : "pending"}`}
                              >
                                <i />
                                <span>{task.title}</span>
                              </span>
                            ))}
                            {tasks.length > 2 && (
                              <span className="calendar-more">
                                Ещё {tasks.length - 2}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="calendar-legend">
            <span>
              <i className="pending" />
              Предстоит
            </span>
            <span>
              <i className="late" />
              Просрочено
            </span>
            <span>
              <i className="completed" />
              Выполнено
            </span>
            <span className="calendar-total">За месяц: {monthTotal}</span>
          </div>
          {withoutDeadline > 0 && (
            <Link className="calendar-no-deadline" to="/my-tasks">
              Без указанного срока: {withoutDeadline}
              <Icon name="arrow" size={14} />
            </Link>
          )}
        </div>
        <aside className="calendar-agenda" aria-label="Задачи выбранного дня">
          <div className="calendar-agenda-heading">
            <span className="eyebrow">
              {selected === today
                ? "СЕГОДНЯ"
                : selectedDate.toLocaleDateString("ru-RU", { weekday: "long" })}
            </span>
            <h3>
              {selectedDate.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <p aria-live="polite">Задач на этот день: {selectedTasks.length}</p>
          </div>
          {selectedTasks.length ? (
            <div className="calendar-agenda-list">
              {selectedTasks.map((task) => {
                const epic = data.epics.find((e) => e.id === task.task_id);
                const late =
                  task.status !== "done" && new Date(task.deadline!) < now;
                return (
                  <Link
                    className="calendar-agenda-task"
                    key={task.id}
                    to={`/tasks/${task.id}`}
                  >
                    <div className="calendar-agenda-time">
                      <span className={late ? "overdue" : ""}>
                        <Icon name="clock" size={13} />
                        {new Date(task.deadline!).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge status={task.status} />
                    </div>
                    <h4>
                      <EntityIcon entity="task" size={15} />
                      {task.title}
                    </h4>
                    {epic && (
                      <p>
                        <EntityIcon entity="epic" size={13} />
                        {epic.title}
                      </p>
                    )}
                    {late && (
                      <span className="calendar-late-label">Срок прошёл</span>
                    )}
                    {task.is_blocked && (
                      <span className="blocked-label">
                        <Icon name="lock" size={13} />
                        Заблокирована
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="calendar-agenda-empty">
              <Icon name="calendar" size={31} />
              <h4>День без дедлайнов</h4>
              <p>На эту дату у вас нет задач с указанным сроком выполнения.</p>
              <Link className="text-link" to="/my-tasks">
                Мои задачи
                <Icon name="arrow" size={15} />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
