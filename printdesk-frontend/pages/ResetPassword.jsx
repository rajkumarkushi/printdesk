import { useState } from "react";
import API from "../services/api";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import billoraLogo from "../src/assets/billora.png";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError(t("resetPassword.errNoMatch"));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t("resetPassword.errMinLength"));
      setLoading(false);
      return;
    }

    try {
      await API.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 4000);
    } catch (err) {
      setError(err.response?.data?.message || t("resetPassword.error"));
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = [
    { label: t("resetPassword.check6"), met: password.length >= 6 },
    { label: t("resetPassword.checkMatch"), met: password.length > 0 && password === confirmPassword },
  ];

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

          {success ? (
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
              <div className="brand-title fs-3 mb-1">{t("resetPassword.success.title")}</div>
              <p className="text-soft mb-0 small" style={{ lineHeight: 1.7 }}>
                {t("resetPassword.success.msg")}<br />
                {t("resetPassword.success.redirect")} <strong>4 {t("resetPassword.success.seconds")}</strong>
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
                &#128274;
              </div>
              <div className="brand-title fs-3 mb-1">{t("resetPassword.title")}</div>
              <p className="text-soft mb-0 small" style={{ lineHeight: 1.7 }}>
                {t("resetPassword.subtitle")}
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

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-floating mb-3">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="form-control"
                id="floatingPassword"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <label htmlFor="floatingPassword">{t("resetPassword.newPassword")}</label>
            </div>
            <div className="form-floating mb-3">
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                className="form-control"
                id="floatingConfirmPassword"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              <label htmlFor="floatingConfirmPassword">{t("resetPassword.confirmPassword")}</label>
            </div>

            <div className="mb-3" style={{ marginTop: -8 }}>
              <label
                style={{ cursor: "pointer", fontSize: 13, color: "#64748b", userSelect: "none" }}
              >
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                {t("resetPassword.show")}
              </label>
            </div>

            {password.length > 0 && (
              <div className="mb-3">
                {passwordChecks.map((check, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                      fontSize: 12,
                      color: check.met ? "#16a34a" : "#94a3b8",
                    }}
                  >
                    <span>{check.met ? "\u2713" : "\u25CB"}</span>
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary w-100 mb-3 py-2"
              type="submit"
              disabled={loading}
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              {loading ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  {t("resetPassword.resetting")}
                </span>
              ) : (
                t("resetPassword.submit")
              )}
            </button>
          </form>
        )}

        <p className="mt-3 text-center small mb-0">
          <Link to="/login" style={{ color: "#1a2742", fontWeight: 500 }}>
            &larr; {t("resetPassword.back")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
