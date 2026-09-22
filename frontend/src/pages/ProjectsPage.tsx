import { useEffect, useState } from "react";

import { api } from "../api/api";
import { ProjectCard } from "../components/ProjectCard";
import { Sidebar } from "../components/Sidebar";
import type { Group } from "../types/group";

export function ProjectsPage() {
    const [projects, setProjects] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProjects() {
            try {
                const response = await api.get("/groups");

                setProjects(response.data);
            } catch {
                setError("Не удалось загрузить проекты");
            } finally {
                setLoading(false);
            }
        }

        loadProjects();
    }, []);

    return (
        <div className="app-layout">
        <Sidebar />

        <main className="main-content">
        <h1>Проекты</h1>

        <p>
        Проекты, доступные текущему пользователю.
        </p>

        {loading && <p>Загрузка...</p>}

        {error && (
            <div className="error-message">
            {error}
            </div>
        )}

        {!loading &&
            !error &&
            projects.length === 0 && (
                <p>Доступных проектов пока нет.</p>
            )}

            <div className="projects-grid">
            {projects.map((project) => (
                <ProjectCard
                key={project.id}
                project={project}
                />
            ))}
            </div>
            </main>
            </div>
    );
}
