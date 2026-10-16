import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TradingTerminal from "./TradingTerminal";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TradingTerminal />
  </StrictMode>,
);
