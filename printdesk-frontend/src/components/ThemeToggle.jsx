import { useState, useEffect } from "react";

const THEMES = ["light", "dark", "system"];
const ICONS = { light: "☀️", dark: "🌙", system: "💻" };

function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

  const applyTheme = (mode) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effective = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-theme", effective);
  };

  useEffect(() => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const cycle = () => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <button
      className="btn btn-outline-secondary btn-sm"
      onClick={cycle}
      title={`Theme: ${theme} (click to switch)`}
      style={{ padding: "6px 10px", minWidth: 38 }}
    >
      {ICONS[theme]}
    </button>
  );
}

export default ThemeToggle;
