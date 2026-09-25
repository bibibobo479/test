import { useNavigate } from "react-router-dom";

import type { Group } from "../types/group";
import { EntityIcon } from "../studio/ui";

interface ProjectCardProps {
  project: Group;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <article className="project-card">
      <span>
        <EntityIcon entity="project" size={16} /> Проект #{project.id}
      </span>

      <h2>{project.name}</h2>

      <p>Руководитель: #{project.teacher_id}</p>

      <button onClick={() => navigate(`/projects/${project.id}`)}>
        Открыть проект
      </button>
    </article>
  );
}
