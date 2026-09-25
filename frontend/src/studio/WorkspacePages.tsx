import { useState } from "react";
import { Link } from "react-router-dom";

import { useSession, useWorkspace } from "./state";

import type { Group } from "./types";

import {
  Avatar,
  Badge,
  Empty,
  EntityIcon,
  Icon,
  PageHeader,
  Progress,
} from "./ui";

import { ProjectForm } from "./Forms";
import { DeadlineCalendar } from "./DeadlineCalendar";

export function ProjectCard({
  group,
  index = 0,
}: {
  group: Group;
  index?: number;
}) {
  const { data } = useWorkspace();

  const epics = data.epics.filter((t) => t.group_id === group.id);

  const ids = new Set(epics.map((t) => t.id));

  const tasks = data.subtasks.filter((t) => ids.has(t.task_id));

  const done = tasks.filter((t) => t.status === "done").length;

  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const members = data.members[group.id] || [];

  const stages = data.stages.filter((s) => s.group_id === group.id);

  const active = stages.some((s) => s.status === "active");

  const complete =
    stages.length > 0 && stages.every((s) => s.status === "completed");

  return (
    <Link
      to={`/projects/${group.id}`}
      className={`project-card tone-${index % 4}`}
    >
      <div className="project-card-top">
        <span className="project-card-icon">
          <EntityIcon entity="project" size={25} />
        </span>

        <Badge
          status={complete ? "completed" : active ? "active" : "planned"}
        />
      </div>

      <span className="card-kicker">
        ПРОЕКТ / {String(group.id).padStart(2, "0")}
      </span>

      <h3>{group.name}</h3>

      <p>
        Этапов: {stages.length}
        <span> · </span>
        Эпиков: {epics.length}
        <span> · </span>
        Задач: {tasks.length}
      </p>

      <div className="progress-label">
        <span>Выполнение задач</span>

        <strong>{progress}%</strong>
      </div>

      <Progress value={progress} />

      <div className="project-card-bottom">
        <div className="avatar-stack">
          {members.slice(0, 3).map((member) => (
            <Avatar key={member.id} name={member.name} small />
          ))}

          <span>
            {members.length
              ? `${members.length} ${
                  members.length === 1
                    ? "участник"
                    : members.length >= 2 && members.length <= 4
                      ? "участника"
                      : "участников"
                }`
              : "Команда пока не собрана"}
          </span>
        </div>

        <Icon name="arrow" size={18} />
      </div>
    </Link>
  );
}

export function Overview() {
  const { data } = useWorkspace();
  const { user } = useSession();

  const [create, setCreate] = useState(false);

  const done = data.subtasks.filter((t) => t.status === "done").length;

  const inProgress = data.subtasks.filter(
    (t) => t.status === "in_progress",
  ).length;

  const review = data.subtasks.filter((t) => t.status === "review").length;

  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";

  return (
    <>
      <PageHeader
        eyebrow="ПРЕВРАЩАЕМ ИДЕИ В РЕЗУЛЬТАТ"
        title={`${greeting}, ${user?.name.split(" ")[0]}.`}
        description="Всё самое важное о ваших проектах, команде и ближайших задачах."
        action={
          <button className="btn primary" onClick={() => setCreate(true)}>
            <Icon name="plus" size={18} />

            {user?.role === "teacher"
              ? "Новый проект"
              : "Присоединиться к проекту"}
          </button>
        }
      />

      <section className="overview-banner">
        <div className="banner-content">
          <span className="banner-label">
            <span />
            ПРОСТРАНСТВО ДЛЯ КОМАНДНОЙ РАБОТЫ
          </span>

          <h2>
            Большие проекты начинаются
            <br />с небольших шагов.
          </h2>

          <p>
            Планируйте этапы, распределяйте задачи и превращайте идеи команды в
            результат.
          </p>

          <Link to="/board">
            Перейти к задачам
            <Icon name="arrow" size={17} />
          </Link>
        </div>

        <div className="banner-art" aria-hidden="true">
          <div className="art-grid" />

          <div className="art-tile tile-back">
            <Icon name="layers" size={52} />
          </div>

          <div className="art-tile tile-front">
            <Icon name="check" size={44} />
          </div>

          <span className="art-spark">✳</span>

          <span className="art-caption">
            РАБОТА В ПРОЦЕССЕ
            <br />
            <b>РЕЗУЛЬТАТ УЖЕ БЛИЗКО.</b>
          </span>
        </div>
      </section>

      <section className="stats-grid">
        {[
          {
            label: "Проекты",
            value: data.groups.length,
            icon: "folder",
            note: "Ваши рабочие пространства",
            tone: "green",
            to: "/projects",
          },
          {
            label: "В работе",
            value: inProgress,
            icon: "clock",
            note: "Задачи, которые сейчас выполняются",
            tone: "blue",
            to: "/board?status=in_progress",
          },
          {
            label: "На проверке",
            value: review,
            icon: "eye",
            note: "Задачи, ожидающие проверки",
            tone: "orange",
            to: "/board?status=review",
          },
          {
            label: "Выполнено задач",
            value: done,
            icon: "check",
            note: `${
              data.subtasks.length
                ? Math.round((done / data.subtasks.length) * 100)
                : 0
            }% от всех задач`,
            tone: "purple",
            to: "/board?status=done",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="stat-card stat-card-link"
          >
            <div>
              <span>{stat.label}</span>

              <span className={`stat-icon ${stat.tone}`}>
                <Icon name={stat.icon} size={18} />
              </span>
            </div>

            <strong>{String(stat.value).padStart(2, "0")}</strong>

            <small>{stat.note}</small>

            <span className="stat-card-arrow">
              <Icon name="arrow" size={16} />
            </span>
          </Link>
        ))}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>
              Ваши проекты{" "}
              <span className="count-pill">{data.groups.length}</span>
            </h2>

            <p>Хороший результат начинается с командной работы.</p>
          </div>

          <Link className="text-link" to="/projects">
            Все проекты
            <Icon name="arrow" size={16} />
          </Link>
        </div>

        {data.groups.length ? (
          <div className="project-grid">
            {data.groups.slice(0, 3).map((group, index) => (
              <ProjectCard key={group.id} group={group} index={index} />
            ))}
          </div>
        ) : (
          <Empty
            title="Ваш первый проект начинается здесь"
            action={
              <button className="btn primary" onClick={() => setCreate(true)}>
                <Icon name="plus" size={17} />

                {user?.role === "teacher"
                  ? "Создать проект"
                  : "Ввести код приглашения"}
              </button>
            }
          >
            {user?.role === "teacher"
              ? "Создайте проект, добавьте участников и начните совместную работу."
              : "Получите код приглашения от преподавателя, чтобы присоединиться к команде и начать работу."}
          </Empty>
        )}
      </section>

      <DeadlineCalendar />

      {create && <ProjectForm onClose={() => setCreate(false)} />}
    </>
  );
}

export function Projects() {
  const { data } = useWorkspace();
  const { user } = useSession();

  const [create, setCreate] = useState(false);

  const [query, setQuery] = useState("");

  const [filter, setFilter] = useState("all");

  const groups = data.groups.filter(
    (group) =>
      group.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        data.stages.some(
          (stage) => stage.group_id === group.id && stage.status === filter,
        )),
  );

  const filters = [
    {
      value: "all",
      label: "Все проекты",
    },
    {
      value: "active",
      label: "Активные",
    },
    {
      value: "planned",
      label: "Запланированные",
    },
    {
      value: "completed",
      label: "Завершённые",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="ПРОСТРАНСТВО ДЛЯ ВАШИХ ИДЕЙ"
        title="Проекты"
        description="Общая картина проектов и все шаги, которые помогают превратить идеи в результат."
        action={
          <button className="btn primary" onClick={() => setCreate(true)}>
            <Icon name="plus" size={18} />

            {user?.role === "teacher"
              ? "Новый проект"
              : "Присоединиться к проекту"}
          </button>
        }
      />

      <div className="toolbar">
        <div className="tabs">
          {filters.map((item) => (
            <button
              key={item.value}
              className={filter === item.value ? "selected" : ""}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="search-input">
          <Icon name="search" size={18} />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти проект…"
            aria-label="Поиск проектов"
          />
        </label>
      </div>

      {groups.length ? (
        <div className="project-grid">
          {groups.map((group, index) => (
            <ProjectCard key={group.id} group={group} index={index} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            data.groups.length
              ? "Проекты не найдены"
              : "Здесь пока нет проектов"
          }
        >
          {data.groups.length
            ? "Попробуйте изменить поисковый запрос или выбрать другой фильтр."
            : "Создайте проект или присоединитесь к существующему, чтобы начать работу с командой."}
        </Empty>
      )}

      {create && <ProjectForm onClose={() => setCreate(false)} />}
    </>
  );
}

export function Reports() {
  const { data } = useWorkspace();

  const total = data.subtasks.length;

  const done = data.subtasks.filter((task) => task.status === "done").length;

  const blocked = data.subtasks.filter((task) => task.is_blocked).length;

  const overdue = data.subtasks.filter(
    (task) =>
      task.status !== "done" &&
      task.deadline &&
      new Date(task.deadline) < new Date(),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="ОБЩАЯ КАРТИНА"
        title="Прогресс команды"
        description="Актуальная информация о ходе работы над доступными вам проектами."
      />

      <section className="stats-grid">
        {[
          {
            label: "Всего задач",
            value: total,
          },
          {
            label: "Выполнено",
            value: `${total ? Math.round((done / total) * 100) : 0}%`,
          },
          {
            label: "Заблокировано",
            value: blocked,
          },
          {
            label: "Просрочено",
            value: overdue,
          },
        ].map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div>{stat.label}</div>

            <strong>{stat.value}</strong>

            <small>По доступным вам проектам</small>
          </div>
        ))}
      </section>

      <div className="overview-lower">
        <section className="panel">
          <div className="panel-heading">
            <h2>Состояние задач</h2>

            <Icon name="chart" />
          </div>

          <div className="status-chart">
            {["todo", "in_progress", "review", "done"].map((status) => {
              const count = data.subtasks.filter(
                (task) => task.status === status,
              ).length;

              return (
                <div key={status}>
                  <div>
                    <Badge status={status} />

                    <strong>{count}</strong>
                  </div>

                  <Progress value={total ? (count / total) * 100 : 0} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Прогресс проектов</h2>

            <EntityIcon entity="project" />
          </div>

          {data.groups.length ? (
            data.groups.map((group) => {
              const ids = new Set(
                data.epics
                  .filter((epic) => epic.group_id === group.id)
                  .map((epic) => epic.id),
              );

              const tasks = data.subtasks.filter((task) =>
                ids.has(task.task_id),
              );

              const complete = tasks.filter(
                (task) => task.status === "done",
              ).length;

              return (
                <Link
                  className="health-row"
                  key={group.id}
                  to={`/projects/${group.id}`}
                >
                  <div>
                    <strong>{group.name}</strong>

                    <span>
                      Выполнено: {complete} / {tasks.length}
                    </span>
                  </div>

                  <Progress
                    value={tasks.length ? (complete / tasks.length) * 100 : 0}
                  />
                </Link>
              );
            })
          ) : (
            <div className="quiet-empty">
              <p>
                Прогресс проектов появится после того, как вы присоединитесь к
                проекту.
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="info-note">
        <Icon name="spark" size={18} />
        Статистика учитывает только проекты и задачи, к которым у вашей учётной
        записи есть доступ.
      </div>
    </>
  );
}
