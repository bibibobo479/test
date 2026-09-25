import { createContext, useContext } from "react";
import axios from "axios";
import type { User, Workspace } from "./types";
export const SessionContext = createContext<{
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}>({ user: null, login: () => {}, logout: () => {} });
export const WorkspaceContext = createContext<{
  data: Workspace;
  refresh: () => void;
  refreshing: boolean;
  notify: (message: string) => void;
} | null>(null);
export const useSession = () => useContext(SessionContext);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Рабочее пространство недоступно");
  return value;
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      if (/[А-Яа-яЁё]/.test(detail)) return detail;
      const messages: Record<string, string> = {
        "Not authenticated": "Войдите в учётную запись, чтобы продолжить.",
        "Not Found": "Запрашиваемая страница или запись не найдена.",
        Forbidden: "Недостаточно прав для этого действия.",
      };
      return (
        messages[detail] || "Не удалось выполнить запрос. Попробуйте ещё раз."
      );
    }
    if (Array.isArray(detail))
      return detail
        .map(
          (item: {
            loc?: (string | number)[];
            msg?: string;
            type?: string;
            ctx?: Record<string, unknown>;
          }) => {
            const fields: Record<string, string> = {
              name: "Имя",
              email: "Электронная почта",
              password: "Пароль",
              title: "Название",
              description: "Описание",
              deadline: "Срок выполнения",
              start_date: "Дата начала",
              expected_result: "Ожидаемый результат",
              max_score: "Максимальный балл",
              student_id: "Исполнитель",
              group_id: "Проект",
              stage_id: "Этап",
              invite_code: "Код приглашения",
              priority: "Приоритет",
              text: "Комментарий",
              result: "Результат",
              external_url: "Ссылка на результат",
            };
            const field = fields[String(item.loc?.at(-1))] || "Поле";
            let message = "Проверьте введённое значение.";
            if (item.msg && /[А-Яа-яЁё]/.test(item.msg))
              message = item.msg.replace(/^Value error,\s*/, "");
            else if (item.type === "missing") message = "Обязательное поле.";
            else if (item.type === "string_too_short")
              message = `Минимальное число символов: ${item.ctx?.min_length}.`;
            else if (item.type === "string_too_long")
              message = `Максимальное число символов: ${item.ctx?.max_length}.`;
            else if (item.type === "greater_than")
              message = `Значение должно быть больше ${item.ctx?.gt}.`;
            else if (item.loc?.at(-1) === "email")
              message = "Введите корректный адрес электронной почты.";
            else if (item.type?.startsWith("datetime"))
              message = "Введите корректные дату и время.";
            return `${field}: ${message}`;
          },
        )
        .join("\n");
    if (!error.response || error.response.status >= 500)
      return "Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.";
    return "Не удалось выполнить запрос. Обновите страницу и попробуйте ещё раз.";
  }
  return error instanceof Error
    ? error.message
    : "Произошла ошибка. Попробуйте ещё раз.";
}
export const statusLabels: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  done: "Выполнено",
  planned: "Запланирован",
  active: "В работе",
  completed: "Завершён",
};
export const priorityLabels: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
};
export const dateLabel = (
  value: string | null,
  options?: Intl.DateTimeFormatOptions,
) =>
  value
    ? new Date(value).toLocaleDateString(
        "ru-RU",
        options || { day: "numeric", month: "short" },
      )
    : "Без срока";
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const safeUrl = (url: string | null) => {
  try {
    const parsed = new URL(url || "");
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
};
