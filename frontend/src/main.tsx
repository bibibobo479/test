import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles/global.css";



import "./styles/global.css";
import "./styles/project.css";
import "./styles/epic.css";

createRoot(
  document.getElementById("root")!,
).render(
  <StrictMode>
  <BrowserRouter>
  <App />
  </BrowserRouter>
  </StrictMode>,
);
