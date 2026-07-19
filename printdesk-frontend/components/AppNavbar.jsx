import { useTranslation } from "react-i18next";
import billoraLogo from "../src/assets/billora.png";
import useAuth from "../hooks/useAuth";

function AppNavbar({ role }) {
  const { t } = useTranslation();
  const { logout } = useAuth();

  return (
    <nav className="app-nav">
      <div className="app-shell d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center logo-wrap"
            style={{ width: 52, height: 52, borderRadius: 14 }}
          >
            <img
              src={billoraLogo}
              alt="Billora Logo"
              style={{ width: "46px", height: "46px", objectFit: "contain" }}
            />
          </div>
          <div>
            <div className="brand-title fs-5">Billora</div>
            <small className="text-soft" style={{ fontSize: "0.75rem" }}>
              {role === "admin" ? t("common.admin") : t("common.user")}
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center gap-2 px-3 py-1"
            style={{
              borderRadius: "999px",
              background: "rgba(79, 70, 229, 0.06)",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--brand)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
            {t("common.active")}
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
            {t("common.logout")}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;
