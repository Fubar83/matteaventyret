import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { MathInputApp } from "./MathInputApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MathInputApp />
  </StrictMode>
);
