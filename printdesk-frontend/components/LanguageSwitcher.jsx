import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "hi", label: "\u0939\u093F\u0928\u094D\u0926\u0940", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { code: "te", label: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("billora-lang", code);
    setOpen(false);
  };

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          fontSize: "0.8rem",
          border: "1px solid var(--bs-border-color, #dee2e6)",
          borderRadius: 6,
          background: "var(--bs-body-bg, #fff)",
          color: "var(--bs-body-color, #212529)",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "1rem" }}>{currentLang.flag}</span>
        <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>&#9662;</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            minWidth: 150,
            background: "var(--bs-body-bg, #fff)",
            border: "1px solid var(--bs-border-color, #dee2e6)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLang(lang.code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                fontSize: "0.85rem",
                border: "none",
                background: i18n.language === lang.code ? "rgba(79,70,229,0.08)" : "transparent",
                color: i18n.language === lang.code ? "var(--bs-primary, #0d6efd)" : "inherit",
                fontWeight: i18n.language === lang.code ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (i18n.language !== lang.code) e.target.style.background = "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                if (i18n.language !== lang.code) e.target.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{lang.flag}</span>
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
