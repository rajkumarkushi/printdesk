import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import billoraLogo from "../src/assets/billora.png";
import LanguageSwitcher from "../components/LanguageSwitcher";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      navigate(res.data.role === "admin" ? "/admin-dashboard" : "/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || t("login.error"));
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
          <div className="brand-title fs-3 mb-1">{t("login.title")}</div>
          <p className="text-soft mb-0 small">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input type="email" name="email" className="form-control" id="floatingEmail" placeholder="name@example.com" onChange={handleChange} required />
            <label htmlFor="floatingEmail">{t("login.email")}</label>
          </div>
          <div className="form-floating mb-4">
            <input type="password" name="password" className="form-control" id="floatingPassword" placeholder="Password" onChange={handleChange} required />
            <label htmlFor="floatingPassword">{t("login.password")}</label>
          </div>
          <div className="d-flex justify-content-end mb-3">
            <Link to="/forgot-password" className="text-decoration-none small">{t("login.forgotPassword")}</Link>
          </div>
          <button className="btn btn-primary w-100 mb-3 py-2">{t("login.submit")}</button>
        </form>

        <div className="d-flex justify-content-center mb-2">
          <LanguageSwitcher />
        </div>

        <p className="mt-3 text-center small mb-0">
          {t("login.noAccount")} <Link to="/register">{t("login.createOne")}</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
