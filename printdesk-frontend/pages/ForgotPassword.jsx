import { useState } from "react";
import API from "../services/api";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import billoraLogo from "../src/assets/billora.png";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || t("forgotPassword.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card modern-card bg-white">
        <div className="mb-4 text-center">
          <div className="d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 56, height: 56 }}>
            <img
              src={billoraLogo}
              alt="Billora Logo"
              style={{
                width: "56px",
                height: "56px",
                objectFit: "contain",
              }}
            />
          </div>

          {sent ? (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 28,
                }}
              >
                &#10003;
              </div>
              <div className="brand-title fs-3 mb-1">{t("forgotPassword.sent.title")}</div>
              <p className="text-soft mb-0 small" style={{ lineHeight: 1.7 }}>
                {t("forgotPassword.sent.msg")}<br />
                <strong style={{ color: "#1a2742" }}>{email}</strong>
              </p>
              <p className="text-soft mt-2 small">
                {t("forgotPassword.sent.spam")}
              </p>
            </>
          ) : (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 28,
                }}
              >
                &#128273;
              </div>
              <div className="brand-title fs-3 mb-1">{t("forgotPassword.title")}</div>
              <p className="text-soft mb-0 small" style={{ lineHeight: 1.7 }}>
                {t("forgotPassword.subtitle")}
              </p>
            </>
          )}
        </div>

        {error && (
          <div
            className="small"
            style={{
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="form-floating mb-4">
              <input
                type="email"
                name="email"
                className="form-control"
                id="floatingEmail"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="floatingEmail">{t("forgotPassword.email")}</label>
            </div>
            <button
              className="btn btn-primary w-100 mb-3 py-2"
              type="submit"
              disabled={loading}
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              {loading ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  {t("forgotPassword.sending")}
                </span>
              ) : (
                t("forgotPassword.submit")
              )}
            </button>
          </form>
        ) : (
          <button
            className="btn btn-primary w-100 mb-3 py-2"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            style={{ borderRadius: 10, fontWeight: 600 }}
          >
            {t("forgotPassword.sent.another")}
          </button>
        )}

        <p className="mt-3 text-center small mb-0">
          <Link to="/login" style={{ color: "#1a2742", fontWeight: 500 }}>
            &larr; {t("forgotPassword.back")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
