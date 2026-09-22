import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";

import { api } from "../api/api";

import { Sidebar } from "../components/Sidebar";
import { TaskCard } from "../components/TaskCard";

import type { Subtask } from "../types/subtask";
import type { Task } from "../types/task";


interface CurrentUser {
    id: number;
    name: string;
    email: string;
    role: string;
}


function formatDate(date: string) {
    return new Date(date).toLocaleDateString(
        "ru-RU",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        },
    );
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


export function EpicPage() {
    const { epicId } = useParams();

    const navigate = useNavigate();

    // ========================================================
    // STATE
    // ========================================================

    const [epic, setEpic] =
    useState<Task | null>(null);

    const [subtasks, setSubtasks] =
    useState<Subtask[]>([]);

    const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

    const [loading, setLoading] =
    useState(true);

    const [error, setError] =
    useState("");

    // Пока backend не отдаёт информацию
    // о том, является ли студент лидером проекта.
    // Позже подключим GroupMember.is_leader.
    const isLeader = false;


    // ========================================================
    // ЗАГРУЗКА EPIC
    // ========================================================

    useEffect(() => {
        async function loadEpic() {
            if (!epicId) {
                setError(
                    "Не указан ID Epic",
                );

                setLoading(false);

                return;
            }

            try {
                setLoading(true);
                setError("");

                const [
                    epicResponse,
              subtasksResponse,
              userResponse,
                ] = await Promise.all([
                    api.get<Task>(
                        `/tasks/${epicId}`,
                    ),

                    api.get<Subtask[]>(
                        `/subtasks/task/${epicId}`,
                    ),

                    api.get<CurrentUser>(
                        "/auth/me",
                    ),
                ]);

                setEpic(
                    epicResponse.data,
                );

                setSubtasks(
                    subtasksResponse.data,
                );

                setCurrentUser(
                    userResponse.data,
                );
            } catch (error) {
                console.error(
                    "Ошибка загрузки Epic:",
                    error,
                );

                setError(
                    "Не удалось загрузить Epic",
                );
            } finally {
                setLoading(false);
            }
        }

        loadEpic();
    }, [epicId]);


    // ========================================================
    // ОБНОВЛЕНИЕ ОДНОЙ ЗАДАЧИ В STATE
    // ========================================================

    function replaceSubtask(
        updated: Subtask,
    ) {
        setSubtasks(
            (currentSubtasks) =>
            currentSubtasks.map(
                (task) =>
                task.id ===
                updated.id
                ? updated
                : task,
            ),
        );
    }


    // ========================================================
    // ВЗЯТЬ ЗАДАЧУ
    // ========================================================

    async function takeTask(
        task: Subtask,
    ) {
        try {
            const response =
            await api.patch<Subtask>(
                `/subtasks/${task.id}/take`,
            );

            replaceSubtask(
                response.data,
            );
        } catch (error) {
            console.error(
                "Ошибка взятия задачи:",
                error,
            );

            alert(
                "Не удалось взять задачу",
            );
        }
    }


    // ========================================================
    // ОСВОБОДИТЬ ЗАДАЧУ
    // ========================================================

    async function releaseTask(
        task: Subtask,
    ) {
        try {
            const response =
            await api.patch<Subtask>(
                `/subtasks/${task.id}/release`,
            );

            replaceSubtask(
                response.data,
            );
        } catch (error) {
            console.error(
                "Ошибка освобождения задачи:",
                error,
            );

            alert(
                "Не удалось освободить задачу",
            );
        }
    }


    // ========================================================
    // TODO -> IN_PROGRESS
    // ========================================================

    async function startTask(
        task: Subtask,
    ) {
        try {
            const response =
            await api.patch<Subtask>(
                `/subtasks/${task.id}/status`,
                {
                    status:
                    "in_progress",
                },
            );

            replaceSubtask(
                response.data,
            );
        } catch (error) {
            console.error(
                "Ошибка запуска задачи:",
                error,
            );

            alert(
                "Не удалось начать работу",
            );
        }
    }


    // ========================================================
    // IN_PROGRESS -> REVIEW
    // ========================================================

    async function sendToReview(
        task: Subtask,
    ) {
        const result =
        window.prompt(
            "Опишите результат работы",
        );

        if (!result?.trim()) {
            return;
        }

        const externalUrl =
        window.prompt(
            "Ссылка на результат (необязательно)",
        );

        try {
            const response =
            await api.patch<Subtask>(
                `/subtasks/${task.id}/status`,
                {
                    status: "review",

                    result:
                    result.trim(),

                                     external_url:
                                     externalUrl?.trim() ||
                                     null,
                },
            );

            replaceSubtask(
                response.data,
            );
        } catch (error) {
            console.error(
                "Ошибка отправки на проверку:",
                error,
            );

            alert(
                "Не удалось отправить задачу на проверку",
            );
        }
    }


    // ========================================================
    // REVIEW -> DONE
    // ========================================================

    async function acceptTask(
        task: Subtask,
    ) {
        try {
            const response =
            await api.patch<Subtask>(
                `/subtasks/${task.id}/status`,
                {
                    status: "done",
                },
            );

            replaceSubtask(
                response.data,
            );
        } catch (error) {
            console.error(
                "Ошибка принятия задачи:",
                error,
            );

            alert(
                "Не удалось принять задачу",
            );
        }
    }


    // ========================================================
    // BLOCK
    // ========================================================

    async function blockTask(
        task: Subtask,
    ) {
        try {
            const response =
            await api.patch<Subtask>(
                `/subtasks/${task.id}/block`,
            );

            replaceSubtask(
                response.data,
            );
        } catch (error) {
            console.error(
                "Ошибка блокировки задачи:",
                error,
            );

            alert(
                "Не удалось заблокировать задачу",
            );
        }
    }


    // ========================================================
    // UNBLOCK
    // ========================================================

    async function unblockTask(
        task: Subtask,
    ) {
        try {
            const response =
            await api.patch<Subtask>(
                `/subtasks/${task.id}/unblock`,
            );

            replaceSubtask(
                response.data,
            );
        } catch (error) {
            console.error(
                "Ошибка разблокировки задачи:",
                error,
            );

            alert(
                "Не удалось разблокировать задачу",
            );
        }
    }


    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {
        return (
            <div className="app-layout">
            <Sidebar />

            <main className="main-content">
            <div className="state-card">
            Загрузка Epic...
            </div>
            </main>
            </div>
        );
    }


    // ========================================================
    // ERROR
    // ========================================================

    if (error || !epic) {
        return (
            <div className="app-layout">
            <Sidebar />

            <main className="main-content">
            <div className="error-message">
            {error ||
                "Epic не найден"}
                </div>
                </main>
                </div>
        );
    }


    // ========================================================
    // ПРОГРЕСС
    // ========================================================

    const completedTasks =
    subtasks.filter(
        (task) =>
        task.status === "done",
    ).length;

    const totalTasks =
    subtasks.length;

    const progress =
    totalTasks === 0
    ? 0
    : Math.round(
        (
            completedTasks /
            totalTasks
        ) * 100,
    );


    // ========================================================
    // PAGE
    // ========================================================

    return (
        <div className="app-layout">
        <Sidebar />

        <main className="main-content">

        {/* BACK */}

        <button
        className="back-button"
        onClick={() =>
            navigate(
                `/projects/${epic.group_id}`,
            )
        }
        >
        ← Назад к проекту
        </button>


        {/* EPIC HEADER */}

        <header className="epic-page-header">
        <div>
        <span className="page-label">
        EPIC #{epic.id}
        </span>

        <h1>
        {epic.title}
        </h1>

        <p>
        {epic.description}
        </p>
        </div>

        <span className="epic-page-status">
        {getStatusName(
            epic.status,
        )}
        </span>
        </header>


        {/* EPIC INFO */}

        <section className="epic-meta">
        <div>
        <span>
        Дедлайн
        </span>

        <strong>
        {formatDate(
            epic.deadline,
        )}
        </strong>
        </div>

        <div>
        <span>
        Этап
        </span>

        <strong>
        #{epic.stage_id}
        </strong>
        </div>

        <div>
        <span>
        Задач
        </span>

        <strong>
        {totalTasks}
        </strong>
        </div>

        <div>
        <span>
        Выполнено
        </span>

        <strong>
        {completedTasks}
        </strong>
        </div>
        </section>


        {/* PROGRESS */}

        <section className="epic-progress">
        <div className="progress-header">
        <span>
        Прогресс Epic
        </span>

        <strong>
        {completedTasks}
        {" / "}
        {totalTasks}
        </strong>
        </div>

        <div className="progress-track">
        <div
        className="progress-value"
        style={{
            width:
            `${progress}%`,
        }}
        />
        </div>

        <span className="progress-percent">
        {progress}%
        </span>
        </section>


        {/* TASKS */}

        <section className="epic-tasks-section">
        <div className="section-header">
        <div>
        <span className="page-label">
        ЗАДАЧИ
        </span>

        <h2>
        Задачи Epic
        </h2>
        </div>

        <span>
        {totalTasks}
        </span>
        </div>


        {/* EMPTY */}

        {totalTasks === 0 ? (
            <div className="empty-state">
            <h3>
            Задач пока нет
            </h3>

            <p>
            В этом Epic ещё
            не создано ни одной
            задачи.
            </p>
            </div>
        ) : (

            /* TASK LIST */

            <div className="tasks-list">
            {subtasks.map(
                (task) => (
                    <TaskCard
                    key={
                        task.id
                    }

                    task={
                        task
                    }

                    currentUserId={
                        currentUser
                        ?.id ??
                        null
                    }

                    currentUserRole={
                        currentUser
                        ?.role ??
                        null
                    }

                    isLeader={
                        isLeader
                    }

                    onTake={
                        takeTask
                    }

                    onRelease={
                        releaseTask
                    }

                    onStart={
                        startTask
                    }

                    onReview={
                        sendToReview
                    }

                    onAccept={
                        acceptTask
                    }

                    onBlock={
                        blockTask
                    }

                    onUnblock={
                        unblockTask
                    }
                    />
                ),
            )}
            </div>
        )}
        </section>
        </main>
        </div>
    );
}
