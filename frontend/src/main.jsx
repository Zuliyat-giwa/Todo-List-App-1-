/**
 * main.jsx - the starting point of the React application.
 *
 * What happens here:
 *   1. We find the empty <div id="root"> from index.html.
 *   2. We tell React to draw our <App /> component inside it.
 *
 * <StrictMode> is a development helper: it warns you about common mistakes.
 * It also runs some code twice on purpose while you develop, which is why
 * you may see two identical requests in the Network tab. That is normal.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
