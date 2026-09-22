import type { ReactNode } from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { LoginPage } from "./pages/LoginPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProjectsPage } from "./pages/ProjectsPage";

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
    <Route
    path="/login"
    element={<LoginPage />}
    />

    <Route
    path="/"
    element={
      <ProtectedRoute>
      <ProjectsPage />
      </ProtectedRoute>
    }
    />

    <Route
    path="/projects/:projectId"
    element={
      <ProtectedRoute>
      <ProjectPage />
      </ProtectedRoute>
    }
    />
    </Routes>
  );
}

export default App;
