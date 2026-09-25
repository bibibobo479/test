import test from "node:test";
import assert from "node:assert/strict";
import {
  dayKey,
  dayDate,
  monthDays,
  moveMonth,
  ownDeadlines,
} from "../src/studio/calendar.ts";

test("Месяц начинается с понедельника и содержит все дни февраля високосного года", () => {
  const days = monthDays(dayDate("2024-02-15"));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(dayKey(days[0]), "2024-01-29");
  assert.equal(days.filter((d) => d.getMonth() === 1).length, 29);
});
test("Навигация не пропускает короткий месяц и переходит через границу года", () => {
  assert.equal(dayKey(moveMonth(dayDate("2024-01-31"), 1)), "2024-02-29");
  assert.equal(dayKey(moveMonth(dayDate("2025-01-31"), 1)), "2025-02-28");
  assert.equal(dayKey(moveMonth(dayDate("2025-01-15"), -1)), "2024-12-15");
  assert.equal(dayKey(moveMonth(dayDate("2024-12-15"), 1)), "2025-01-15");
});
test("Дедлайны принадлежат только текущему исполнителю, а задачи без срока исключаются", () => {
  const base = {
    student_id: 7,
    status: "todo",
    deadline: "2026-09-23T12:00:00",
  };
  const tasks = [
    { ...base, id: 1 },
    { ...base, id: 2, student_id: 9 },
    { ...base, id: 3, student_id: null },
    { ...base, id: 4, deadline: null },
    { ...base, id: 5, deadline: "incorrect" },
    { ...base, id: 6, status: "done", deadline: "2026-09-23T09:00:00" },
  ];
  assert.deepEqual(
    ownDeadlines(tasks, 7, true)
      .get("2026-09-23")
      .map((t) => t.id),
    [6, 1],
  );
  assert.deepEqual(
    ownDeadlines(tasks, 7, false)
      .get("2026-09-23")
      .map((t) => t.id),
    [1],
  );
  assert.equal(ownDeadlines(tasks, 99, true).size, 0);
});
test("Ключи дат учитывают локальный часовой пояс, а не обрезают UTC-строку", () => {
  const deadline = "2026-09-23T23:30:00Z";
  const days = ownDeadlines(
    [{ id: 1, student_id: 7, status: "review", deadline }],
    7,
    true,
  );
  assert.ok(days.has(dayKey(new Date(deadline))));
  assert.equal(dayKey(dayDate("2026-03-29")), "2026-03-29");
});
