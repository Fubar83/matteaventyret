import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { TrainerApp } from "./TrainerApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TrainerApp />
  </StrictMode>
);
