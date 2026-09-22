import { useNavigate } from "react-router-dom";

export function Sidebar() {
    const navigate = useNavigate();

    function logout() {
        localStorage.removeItem("access_token");
        navigate("/login");
    }

    return (
        <aside className="sidebar">
        <div>
        <h2>Project Lab</h2>

        <nav>
        <button onClick={() => navigate("/")}>
        Проекты
        </button>

        <button disabled>
        Мои задачи
        </button>

        <button disabled>
        Отчёты
        </button>
        </nav>
        </div>

        <button onClick={logout}>
        Выйти
        </button>
        </aside>
    );
}
