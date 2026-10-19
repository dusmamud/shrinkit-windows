import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import { ThemeProvider } from "./lib/theme";
import App from "./App";

// Desktop professionalism: suppress the WebView's default right-click menu
// (Back / Refresh / Save as / Print) — this is an app, not a browser.
window.addEventListener("contextmenu", (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
