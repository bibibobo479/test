import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./api/api";
import { SessionContext, errorMessage } from "./studio/state";
import type { User } from "./studio/types";
import { AuthPage } from "./studio/AuthPage";
import { Shell } from "./studio/Shell";
import { ErrorBox, Loading } from "./studio/ui";
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    () => !!localStorage.getItem("access_token"),
  );
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const from = location.state?.from;
  const destination =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    !["/login", "/register"].includes(from)
      ? from
      : "/";
  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
    setError("");
  }, []);
  useEffect(() => {
    window.addEventListener("sda:unauthorized", logout);
    return () => window.removeEventListener("sda:unauthorized", logout);
  }, [logout]);
  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    let live = true;
    api
      .get<User>("/auth/me")
      .then(({ data }) => {
        if (live) {
          setUser(data);
          setError("");
        }
      })
      .catch((e) => {
        if (live && localStorage.getItem("access_token"))
          setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  if (loading)
    return (
      <div className="startup">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="startup">
        <div>
          <ErrorBox
            message={error}
            retry={() => {
              setLoading(true);
              setAttempt((a) => a + 1);
            }}
          />
          <button className="btn secondary" onClick={logout}>
            Вернуться ко входу
          </button>
        </div>
      </div>
    );
  return (
    <SessionContext.Provider value={{ user, login: setUser, logout }}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={destination} replace /> : <AuthPage />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <AuthPage register />}
        />
        <Route
          path="*"
          element={
            user ? (
              <Shell key={user.id} />
            ) : (
              <Navigate
                to="/login"
                state={{ from: location.pathname + location.search }}
                replace
              />
            )
          }
        />
      </Routes>
    </SessionContext.Provider>
  );
}
export default App;
