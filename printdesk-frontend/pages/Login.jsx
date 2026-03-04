import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await API.post("/auth/login", form);
    console.log(res.data);

    // Store token
    localStorage.setItem("token", res.data.token);

    // 🔥 Store role (optional but recommended)
    localStorage.setItem("role", res.data.role);

    // 🔥 Role-based redirect
    if (res.data.role === "admin") {
      navigate("/admin-dashboard");
    } else {
      navigate("/dashboard");
    }

  } catch (err) {
    alert(err.response?.data?.message || "Login failed");
  }
};

  return (
    <div className="auth-page">
      <div className="auth-card card shadow-lg p-4 p-md-5 bg-white border-0">
        <div className="mb-4 text-center">
          <div className="auth-logo mb-1">Billora</div>
          <p className="text-muted mb-0 small">
            Smart Billing for Growing Businesses
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-3">
          <div className="form-floating mb-3">
            <input
              type="email"
              name="email"
              className="form-control"
              id="floatingEmail"
              placeholder="name@example.com"
              onChange={handleChange}
              required
            />
            <label htmlFor="floatingEmail">Email address</label>
          </div>

          <div className="form-floating mb-4">
            <input
              type="password"
              name="password"
              className="form-control"
              id="floatingPassword"
              placeholder="Password"
              onChange={handleChange}
              required
            />
            <label htmlFor="floatingPassword">Password</label>
          </div>

          <button className="btn btn-primary w-100 mb-3 py-2">
            Login
          </button>
        </form>

        <p className="mt-3 text-center small mb-0">
          Don’t have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;