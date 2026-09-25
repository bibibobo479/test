import { useState, type FormEvent } from "react";

import { Link, useNavigate } from "react-router-dom";

import axios from "axios";

import { api } from "../api/api";

export function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [repeatPassword, setRepeatPassword] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");

      return;
    }

    if (password !== repeatPassword) {
      setError("Пароли не совпадают");

      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      /*
       * После успешной регистрации
       * отправляем пользователя на вход.
       *
       * Автоматически логиниться пока
       * не будем: backend register
       * создаёт пользователя, но login
       * отвечает за выдачу JWT.
       */
      navigate("/login", {
        state: {
          registered: true,
        },
      });
    } catch (error) {
      console.error("Ошибка регистрации:", error);

      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (typeof detail === "string") {
          setError(detail);
          return;
        }
      }

      setError("Не удалось зарегистрироваться");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <span className="auth-label">PROJECT LAB</span>

        <h1>Регистрация</h1>

        <p className="auth-description">Создайте аккаунт студента</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Имя
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Иван Иванов"
              autoComplete="name"
              required
            />
          </label>

          <label>
            Электронная почта
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 8 символов"
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Повторите пароль
            <input
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              placeholder="Повторите пароль"
              autoComplete="new-password"
              required
            />
          </label>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        <div className="auth-footer">
          Уже есть аккаунт?
          <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}
