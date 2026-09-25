import { api } from "../api/api";
import { useSession, useWorkspace } from "./state";
import type { Epic, Group, Stage } from "./types";
import { ActionForm, Field, Modal } from "./ui";
const value = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();
const optional = (data: FormData, key: string) => value(data, key) || null;
export function ProjectForm({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  const { refresh, notify } = useWorkspace();
  const teacher = user?.role === "teacher";
  return (
    <Modal
      title={teacher ? "Новый проект" : "Присоединиться к проекту"}
      subtitle={
        teacher
          ? "Придумайте название проекта. Участников можно пригласить после создания."
          : "Введите код приглашения, который вам передал преподаватель."
      }
      onClose={onClose}
    >
      <ActionForm
        label={teacher ? "Создать проект" : "Присоединиться"}
        onClose={onClose}
        submit={async (data) => {
          await api.post(
            teacher ? "/groups" : "/groups/join",
            teacher
              ? { name: value(data, "name") }
              : { invite_code: value(data, "code").toUpperCase() },
          );
          refresh();
          notify(teacher ? "Проект создан." : "Вы присоединились к проекту.");
        }}
      >
        <Field label={teacher ? "Название проекта" : "Код приглашения"}>
          <input
            name={teacher ? "name" : "code"}
            autoFocus
            required
            minLength={teacher ? 2 : 6}
            maxLength={teacher ? 100 : 20}
            placeholder={
              teacher ? "Например, «Мир приключений»" : "Например, AB12CD"
            }
            className={teacher ? "" : "code-input"}
          />
        </Field>
      </ActionForm>
    </Modal>
  );
}
export function StageForm({
  group,
  stage,
  onClose,
}: {
  group: Group;
  stage?: Stage;
  onClose: () => void;
}) {
  const { refresh, notify } = useWorkspace();
  return (
    <Modal
      title={stage ? "Редактировать этап" : "Новый этап"}
      subtitle={`Спланируйте следующий этап проекта «${group.name}».`}
      onClose={onClose}
    >
      <ActionForm
        label={stage ? "Сохранить этап" : "Создать этап"}
        onClose={onClose}
        submit={async (data) => {
          const payload = {
            title: value(data, "title"),
            description: optional(data, "description"),
            start_date: optional(data, "start_date"),
            deadline: optional(data, "deadline"),
            expected_result: optional(data, "expected_result"),
          };
          if (
            payload.start_date &&
            payload.deadline &&
            payload.deadline < payload.start_date
          )
            throw new Error(
              "Срок завершения не может быть раньше даты начала.",
            );
          if (stage) await api.patch(`/stages/${stage.id}`, payload);
          else await api.post(`/stages/group/${group.id}`, payload);
          refresh();
          notify(stage ? "Этап обновлён." : "Этап создан.");
        }}
      >
        <Field label="Название этапа">
          <input
            name="title"
            minLength={3}
            maxLength={200}
            defaultValue={stage?.title}
            placeholder="Например, «Исследование и проектирование»"
            required
            autoFocus
          />
        </Field>
        <Field label="Описание">
          <textarea
            name="description"
            defaultValue={stage?.description || ""}
            placeholder="Над чем будет работать команда?"
            rows={3}
          />
        </Field>
        <div className="form-row">
          <Field label="Дата начала">
            <input
              type="datetime-local"
              name="start_date"
              defaultValue={stage?.start_date?.slice(0, 16)}
            />
          </Field>
          <Field label="Срок выполнения">
            <input
              type="datetime-local"
              name="deadline"
              defaultValue={stage?.deadline?.slice(0, 16)}
            />
          </Field>
        </div>
        <Field label="Ожидаемый результат">
          <textarea
            name="expected_result"
            defaultValue={stage?.expected_result || ""}
            placeholder="Какой результат нужно получить?"
            rows={2}
          />
        </Field>
      </ActionForm>
    </Modal>
  );
}
export function EpicForm({
  group,
  stage,
  onClose,
}: {
  group: Group;
  stage: Stage;
  onClose: () => void;
}) {
  const { data: workspace, refresh, notify } = useWorkspace();
  return (
    <Modal
      title="Новый эпик"
      subtitle={`Создайте эпик в этапе «${stage.title}».`}
      onClose={onClose}
    >
      <ActionForm
        label="Создать эпик"
        onClose={onClose}
        submit={async (data) => {
          const deadline = value(data, "deadline");
          if (new Date(deadline) <= new Date())
            throw new Error("Укажите срок выполнения в будущем.");
          await api.post("/tasks", {
            title: value(data, "title"),
            description: value(data, "description"),
            deadline,
            max_score: Number(data.get("max_score")),
            student_id: optional(data, "student_id")
              ? Number(data.get("student_id"))
              : null,
            group_id: group.id,
            stage_id: stage.id,
          });
          refresh();
          notify("Эпик создан. Студенты могут добавлять задачи.");
        }}
      >
        <Field label="Название эпика">
          <input
            name="title"
            minLength={3}
            maxLength={200}
            placeholder="Например, «Создать первый игровой уровень»"
            required
            autoFocus
          />
        </Field>
        <Field label="Описание">
          <textarea
            name="description"
            minLength={3}
            required
            rows={3}
            placeholder="Опишите цель и результат, который нужно получить."
          />
        </Field>
        <div className="form-row">
          <Field label="Срок выполнения">
            <input name="deadline" type="datetime-local" required />
          </Field>
          <Field label="Максимальный балл">
            <input
              name="max_score"
              type="number"
              min={1}
              step={1}
              defaultValue={100}
              required
            />
          </Field>
        </div>
        <Field
          label="Исполнитель"
          hint="Общий эпик доступен всей команде. Индивидуальный — назначенному студенту и преподавателю."
        >
          <select name="student_id">
            <option value="">Вся команда</option>
            {workspace.members[group.id]?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
      </ActionForm>
    </Modal>
  );
}
export function SubtaskForm({
  epic,
  onClose,
}: {
  epic: Epic;
  onClose: () => void;
}) {
  const { refresh, notify } = useWorkspace();
  return (
    <Modal
      title="Новая задача"
      subtitle={`Добавьте задачу в эпик «${epic.title}».`}
      onClose={onClose}
    >
      <ActionForm
        label="Создать задачу"
        onClose={onClose}
        submit={async (data) => {
          await api.post(`/subtasks/task/${epic.id}`, {
            title: value(data, "title"),
            description: optional(data, "description"),
            deadline: optional(data, "deadline"),
            priority: value(data, "priority"),
            take_for_myself: data.get("take_for_myself") === "on",
          });
          refresh();
          notify("Задача создана.");
        }}
      >
        <Field label="Название задачи">
          <input
            name="title"
            minLength={3}
            maxLength={200}
            placeholder="Что нужно сделать?"
            required
            autoFocus
          />
        </Field>
        <Field label="Описание">
          <textarea
            name="description"
            rows={3}
            placeholder="Добавьте подробности для команды."
          />
        </Field>
        <div className="form-row">
          <Field label="Срок выполнения (необязательно)">
            <input type="datetime-local" name="deadline" />
          </Field>
          <Field label="Приоритет">
            <select name="priority" defaultValue="normal">
              <option value="low">Низкий</option>
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
            </select>
          </Field>
        </div>
        {epic.student_id === null && (
          <label className="checkbox-field">
            <input type="checkbox" name="take_for_myself" defaultChecked />
            <span>Назначить задачу себе</span>
          </label>
        )}
      </ActionForm>
    </Modal>
  );
}
export function AddMemberForm({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const { refresh, notify } = useWorkspace();
  return (
    <Modal
      title="Добавить участника"
      subtitle="Укажите ID зарегистрированного студента или передайте ему код приглашения в проект."
      onClose={onClose}
    >
      <ActionForm
        label="Добавить студента"
        onClose={onClose}
        submit={async (data) => {
          await api.post(`/groups/${group.id}/students`, {
            student_id: Number(data.get("student_id")),
          });
          refresh();
          notify("Студент добавлен в проект.");
        }}
      >
        <Field label="ID студента">
          <input
            name="student_id"
            type="number"
            min={1}
            step={1}
            required
            autoFocus
            placeholder="Например, 12"
          />
        </Field>
        <div className="info-note">
          Код приглашения в проект:{" "}
          <strong className="mono">{group.invite_code}</strong>
        </div>
      </ActionForm>
    </Modal>
  );
}
