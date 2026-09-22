import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/api";

export function LoginPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/login", {
                email,
                password,
            });

            localStorage.setItem(
                "access_token",
                response.data.access_token,
            );

            navigate("/");
        } catch {
            setError("Неверная почта или пароль");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
        <div className="login-card">
        <h1>Project Lab</h1>

        <p>Система управления проектами лаборатории</p>

        <form onSubmit={handleSubmit}>
        <label>
        Электронная почта

        <input
        type="email"
        value={email}
        onChange={(event) =>
            setEmail(event.target.value)
        }
        required
        />
        </label>

        <label>
        Пароль

        <input
        type="password"
        value={password}
        onChange={(event) =>
            setPassword(event.target.value)
        }
        required
        />
        </label>

        {error && (
            <div className="error-message">
            {error}
            </div>
        )}

        <button
        type="submit"
        disabled={loading}
        >
        {loading ? "Входим..." : "Войти"}
        </button>
        </form>
        </div>
        </div>
    );
}
