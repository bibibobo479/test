import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/api";
import { errorMessage, useSession } from "./state";
import type { User } from "./types";
import { Brand, ErrorBox, Field, Icon } from "./ui";
export function AuthPage({ register = false }: { register?: boolean }) {
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const credentials = {
      email: String(data.get("email")).trim(),
      password: String(data.get("password")),
    };
    try {
      if (register) {
        await api.post("/auth/register", {
          ...credentials,
          name: String(data.get("name")).trim(),
        });
        navigate("/login", { state: { registered: true }, replace: true });
        return;
      }
      const response = await api.post("/auth/login", credentials);
      localStorage.setItem("access_token", response.data.access_token);
      const { data: user } = await api.get<User>("/auth/me");
      login(user);
      const from = location.state?.from;
      navigate(
        typeof from === "string" &&
          from.startsWith("/") &&
          !from.startsWith("//") &&
          !["/login", "/register"].includes(from)
          ? from
          : "/",
        { replace: true },
      );
    } catch (e) {
      localStorage.removeItem("access_token");
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="overline">ПОНЯТНЫЙ ПЛАН. БОЛЬШИЕ ВОЗМОЖНОСТИ.</span>
          <h1>
            Смелые идеи.
            <br />
            Общая цель.
            <br />
            <em>Настоящий результат.</em>
          </h1>
          <p>
            Пространство для проектов вашей команды. Планируйте работу,
            создавайте вместе и двигайтесь к общей цели.
          </p>
          <div className="orbit-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit-core">
              <Icon name="layers" size={58} />
            </div>
            <span className="orbit-chip chip-one">
              <span className="chip-check">
                <Icon name="check" size={16} />
              </span>
              Этап завершён
            </span>
            <span className="orbit-chip chip-two">
              <Icon name="spark" size={19} /> Создано вместе
            </span>
            <span className="orbit-node node-one" />
            <span className="orbit-node node-two" />
          </div>
        </div>
        <div className="auth-bottom">
          <span>Учимся, создаём и растём вместе.</span>
          <span>✳</span>
        </div>
      </section>
      <main className="auth-main">
        <span className="auth-topline">
          Ваш следующий проект начинается здесь
        </span>
        <div className="auth-form">
          <span className="welcome-icon">
            <Icon name="spark" size={27} />
          </span>
          <div className="eyebrow">SDA STUDIO</div>
          <h2>{register ? "Место для ваших идей." : "С возвращением."}</h2>
          <p>
            {register
              ? "Создайте учётную запись студента и присоединитесь к команде."
              : "Войдите, чтобы продолжить работу над проектами."}
          </p>
          {!register && location.state?.registered && (
            <div className="success-note">
              Учётная запись создана. Войдите, чтобы начать работу.
            </div>
          )}
          <form
            onSubmit={submit}
            className="form"
            key={register ? "register" : "login"}
          >
            <fieldset disabled={busy}>
              {register && (
                <Field label="Имя и фамилия">
                  <input
                    name="name"
                    placeholder="Как вас зовут?"
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </Field>
              )}
              <Field label="Электронная почта">
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Пароль">
                <span className="password-input">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      register ? "Не менее 6 символов" : "Введите пароль"
                    }
                    minLength={register ? 6 : undefined}
                    maxLength={100}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                  >
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                </span>
              </Field>
            </fieldset>
            {error && <ErrorBox message={error} />}
            <button className="btn primary auth-submit" disabled={busy}>
              {busy ? "Подождите…" : register ? "Зарегистрироваться" : "Войти"}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Уже есть учётная запись?" : "Ещё нет учётной записи?"}{" "}
            <Link
              to={register ? "/login" : "/register"}
              onClick={() => setError("")}
            >
              {register ? "Войти" : "Зарегистрироваться"}
            </Link>
          </p>
          <div className="auth-note">
            <Icon name="people" size={18} />
            <span>
              {register
                ? "Есть код приглашения? Присоединиться к проекту можно после входа."
                : "Общее пространство для студентов, преподавателей и командной работы."}
            </span>
          </div>
        </div>
        <footer>
          SDA Studio <span>Идеи становятся результатом.</span>
        </footer>
      </main>
    </div>
  );
}
