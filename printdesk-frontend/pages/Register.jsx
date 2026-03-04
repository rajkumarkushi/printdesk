import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
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
      await API.post("/auth/register", form);
      alert("Registered Successfully");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Error");
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

        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input
              type="text"
              name="businessName"
              className="form-control"
              id="floatingBusiness"
              placeholder="Business Name"
              onChange={handleChange}
              required
            />
            <label htmlFor="floatingBusiness">Business Name</label>
          </div>

          <div className="form-floating mb-3">
            <input
              type="text"
              name="ownerName"
              className="form-control"
              id="floatingOwner"
              placeholder="Owner Name"
              onChange={handleChange}
              required
            />
            <label htmlFor="floatingOwner">Owner Name</label>
          </div>

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

          <button className="btn btn-success w-100 mb-3 py-2">
            Create Account
          </button>
        </form>

        <p className="mt-3 text-center small mb-0">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;