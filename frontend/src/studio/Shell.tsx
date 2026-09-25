import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "../api/api";
import { WorkspaceContext, errorMessage, useSession } from "./state";
import type { Epic, Group, Member, Stage, Subtask, Workspace } from "./types";
import { Avatar, Brand, Empty, ErrorBox, Icon, Loading } from "./ui";
import { Overview, Projects, Reports } from "./WorkspacePages";
import { ProjectDetail, EpicDetail } from "./ProjectDetail";
import { TaskBoard, TaskDetail } from "./Tasks";
export function Shell() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const [groups, epics] = await Promise.all([
          api.get<Group[]>("/groups"),
          api.get<Epic[]>("/tasks"),
        ]);
        const [stageLists, memberLists, subtaskLists] = await Promise.all([
          Promise.all(
            groups.data.map((g) => api.get<Stage[]>(`/stages/group/${g.id}`)),
          ),
          Promise.all(
            groups.data.map((g) =>
              api.get<Member[]>(`/groups/${g.id}/students`),
            ),
          ),
          Promise.all(
            epics.data.map((t) => api.get<Subtask[]>(`/subtasks/task/${t.id}`)),
          ),
        ]);
        if (live) {
          setData({
            groups: groups.data,
            epics: epics.data,
            stages: stageLists.flatMap((r) => r.data),
            subtasks: subtaskLists.flatMap((r) => r.data),
            members: Object.fromEntries(
              groups.data.map((g, i) => [g.id, memberLists[i].data]),
            ),
          });
          setError("");
        }
      } catch (e) {
        if (live) setError(errorMessage(e));
      } finally {
        if (live) setRefreshing(false);
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, [version]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const nav = [
    { path: "/", icon: "grid", label: "Главная" },
    { path: "/projects", icon: "folder", label: "Проекты" },
    { path: "/my-tasks", icon: "tasks", label: "Мои задачи" },
    { path: "/board", icon: "board", label: "Доска задач" },
    { path: "/reports", icon: "chart", label: "Статистика" },
  ];
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Закрыть меню"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`studio-sidebar ${mobileOpen ? "open" : ""}`}>
        <Link
          to="/"
          aria-label="SDA Studio — главная"
          onClick={() => setMobileOpen(false)}
        >
          <Brand />
        </Link>
        <div className="spacer" style={{ marginBottom: "50px" }} />
        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.path === "/my-tasks" &&
                !!data?.subtasks.filter(
                  (t) => t.student_id === user?.id && t.status !== "done",
                ).length && (
                  <span className="nav-count">
                    {
                      data.subtasks.filter(
                        (t) => t.student_id === user?.id && t.status !== "done",
                      ).length
                    }
                  </span>
                )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-projects">
          <div className="nav-label">
            ВАШИ ПРОЕКТЫ <span>{data?.groups.length || 0}</span>
          </div>
          {data?.groups.slice(0, 4).map((g) => (
            <Link
              key={g.id}
              to={`/projects/${g.id}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon name="folder" size={16} />
              <span>{g.name}</span>
            </Link>
          ))}
          {!data?.groups.length && <p>Здесь появятся ваши проекты.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <Avatar name={user!.name} />
            <div>
              <strong>{user!.name}</strong>
              <small>
                {user!.role === "teacher" ? "Преподаватель" : "Студент"}
              </small>
            </div>
            <button
              className="icon-button"
              title="Выйти"
              aria-label="Выйти"
              onClick={logout}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <button
          className="btn secondary mobile-navigation"
          aria-label="Открыть меню"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Icon name="menu" size={18} /> Меню
        </button>
        <main className="page-content" id="main-content">
          {error && <ErrorBox message={error} retry={refresh} />}{" "}
          {!data ? (
            refreshing ? (
              <Loading />
            ) : (
              <Empty
                title="Не удалось загрузить проекты"
                action={
                  <button className="btn primary" onClick={refresh}>
                    Подключиться снова
                  </button>
                }
              >
                Проверьте подключение к серверу и попробуйте ещё раз.
              </Empty>
            )
          ) : (
            <WorkspaceContext.Provider
              value={{ data, refresh, refreshing, notify: setToast }}
            >
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/projects" element={<Projects />} />
                <Route
                  path="/projects/:projectId"
                  element={<ProjectDetail />}
                />
                <Route path="/epics/:epicId" element={<EpicDetail />} />
                <Route path="/tasks/:taskId" element={<TaskDetail />} />
                <Route path="/my-tasks" element={<TaskBoard mine />} />
                <Route path="/board" element={<TaskBoard />} />
                <Route path="/kanban" element={<TaskBoard />} />
                <Route path="/reports" element={<Reports />} />
                <Route
                  path="*"
                  element={
                    <Empty
                      title="Страница не найдена"
                      action={
                        <button
                          className="btn primary"
                          onClick={() => navigate("/")}
                        >
                          На главную
                        </button>
                      }
                    >
                      Вернитесь на главную, чтобы продолжить работу.
                    </Empty>
                  }
                />
              </Routes>
            </WorkspaceContext.Provider>
          )}
        </main>
        <footer className="workspace-footer">
          <span>SDA Studio</span>
          <span>
            Каждый день — на шаг ближе к результату.{" "}
            <Icon name="spark" size={13} />
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={18} />
          </span>
          {toast}
          <button
            className="icon-button"
            aria-label="Закрыть уведомление"
            onClick={() => setToast("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
