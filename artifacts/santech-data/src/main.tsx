import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App";
import "./index.css";

setBaseUrl(import.meta.env.BASE_URL);
setAuthTokenGetter(() => localStorage.getItem("santech_token"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
