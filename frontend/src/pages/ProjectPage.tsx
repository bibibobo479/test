import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/api";
import { Sidebar } from "../components/Sidebar";
import { StageCard } from "../components/StageCard";

import type { Stage } from "../types/stage";
import type { Task } from "../types/task";

export function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [stages, setStages] = useState<Stage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProjectData() {
      if (!projectId) {
        setError("Не указан ID проекта");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [stagesResponse, tasksResponse] = await Promise.all([
          api.get(`/stages/group/${projectId}`),
          api.get("/tasks"),
        ]);

        setStages(stagesResponse.data);

        const projectTasks = tasksResponse.data.filter(
          (task: Task) => task.group_id === Number(projectId),
        );

        setTasks(projectTasks);
      } catch (error) {
        console.error("Ошибка загрузки проекта:", error);

        setError("Не удалось загрузить данные проекта");
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [projectId]);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Назад к проектам
        </button>

        <header className="project-header">
          <span className="page-label">ПРОЕКТ #{projectId}</span>

          <h1>Этапы проекта</h1>

          <p>Этапы, результаты и текущее состояние проекта.</p>
        </header>

        {loading && <div className="state-card">Загрузка проекта...</div>}

        {error && <div className="error-message">{error}</div>}

        {!loading && !error && stages.length === 0 && (
          <div className="empty-state">
            <h2>Этапов пока нет</h2>

            <p>Для этого проекта ещё не создано ни одного этапа.</p>
          </div>
        )}

        {!loading && !error && stages.length > 0 && (
          <div className="stages-list">
            {stages.map((stage) => {
              const stageEpics = tasks.filter(
                (task) => task.stage_id === stage.id,
              );

              return (
                <StageCard key={stage.id} stage={stage} epics={stageEpics} />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
