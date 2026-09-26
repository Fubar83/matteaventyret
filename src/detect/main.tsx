import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { DetectApp } from "./DetectApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DetectApp />
  </StrictMode>
);
