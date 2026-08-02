import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./contexts/LanguageContext";
import App from "./App.tsx";
import "./index.css";
import { installDiagnosticsRecorder } from "./lib/diagnosticsRecorder";

installDiagnosticsRecorder();

// Apply saved language before render
const savedLang = localStorage.getItem("lang") === "en" ? "en" : "ar";
document.documentElement.lang = savedLang;
document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";

// Apply saved theme before render to avoid flash
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </HelmetProvider>
);
