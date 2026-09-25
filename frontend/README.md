# SDA Studio frontend

React + TypeScript UI for the FastAPI routers in `../routers`. Uses the existing React Router and Axios dependencies; no additional packages are required.

## Run locally

Start the backend from the project root:

```bash
cd /home/user/sda
source venv/bin/activate
uvicorn main:app --reload
```

Start the frontend in another terminal:

```bash
cd /home/user/sda/frontend
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Vite proxies `/api` to `http://127.0.0.1:8000`, so the browser and API work together even if Vite chooses a different port. Start the configured database before running the backend.

Optional settings in `.env.local`:

```dotenv
# Backend target used by the Vite development proxy:
API_PROXY_TARGET=http://127.0.0.1:8000
# Optional direct API URL. Omit to use /api:
# VITE_API_URL=https://api.example.com
```

For production, serve the build with an SPA fallback to `index.html` and reverse-proxy `/api/*` to the backend, stripping `/api`. Alternatively, set `VITE_API_URL` before building and configure the backend's CORS origins for your deployed frontend. `npm run preview` previews the static build; it is not a production API proxy.

## Screens and workflows

- **Overview:** live project/task totals and an interactive monthly calendar of the current user's task deadlines, with daily agendas and a completed-task filter.
- **Projects:** search, stage filters, project invite codes, roadmap, and team.
- **Stages and epics:** teachers create/edit/delete empty stages, change stage status, and create team or individual epics.
- **Task board / My tasks:** board and list views; project, priority, blocked, and text filters. Open a task to act on it.
- **Task details:** claim/release tasks, start work, submit a result and optional link, review acceptance, blocking, comments, and audit history.
- **Insights:** actual accessible task totals, status distribution, overdue/blocked work, and project progress.
- **Authentication:** registration, sign-in, protected routes, session expiry, and sign-out.

Registration creates a **student**, as defined by the backend. Use an existing teacher account to manage projects. Students join with an invite code or can be added by account ID. The project Team tab shows the signed-in account's ID.

The existing backend allows only **students** to create subtasks and change their status. Only the assigned student can advance `todo → in_progress → review`; a result is required for review. Only the project's **student leader** can accept `review → done`. Teachers and student leaders can block/unblock tasks. The UI follows these permissions, and the server remains the authority.

`GET /groups/{id}/students` now includes the existing membership `is_leader` flag so the interface can show correct review controls. No schema migration is needed. The current backend has no endpoint to appoint a leader, so existing leader assignments must already be configured in the database.

## Checks

```bash
npm run build
npm run lint
node --test --test-isolation=none tests/calendar.test.mjs
```

The calendar tests require Node.js 24 and should also run with `TZ=Europe/Moscow` and `TZ=America/New_York` to check local date handling.

Browser verification should use fixtures or a disposable database and teacher/student/leader accounts. Check project → stage → epic creation, student membership, subtask creation and status transitions, comments/history, calendar navigation and ownership filtering, and desktop/mobile layouts. Also verify an expired session, an empty account, and an unavailable backend.

The active implementation is in `src/studio`, with styles in `src/styles/studio.css` and `src/styles/calendar.css`. Interface text is in Russian. `EntityIcon` in `src/studio/ui.tsx` maps projects to folders, stages to layers, and epics to flags. Sidebar navigation is configured in `src/studio/Shell.tsx`. Older components and pages remain in their original directories but are not loaded by the new application. No demonstration data is included in the application.
