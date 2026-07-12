import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import billoraLogo from "../src/assets/billora.png";

function Register() {
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    gstNumber: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/register", form);
      const id = res.data.id;
      navigate(`/upload-logo/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Error");
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
          <div className="brand-title fs-3 mb-1">Start with Billora</div>
          <p className="text-soft mb-0 small">Create your business billing workspace.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-floating mb-3">
            <input type="text" name="businessName" className="form-control" id="floatingBusiness" placeholder="Business Name" onChange={handleChange} required />
            <label htmlFor="floatingBusiness">Business Name</label>
          </div>
          <div className="form-floating mb-3">
            <input type="text" name="ownerName" className="form-control" id="floatingOwner" placeholder="Owner Name" onChange={handleChange} required />
            <label htmlFor="floatingOwner">Owner Name</label>
          </div>
          <div className="form-floating mb-3">
            <input type="email" name="email" className="form-control" id="floatingEmail" placeholder="name@example.com" onChange={handleChange} required />
            <label htmlFor="floatingEmail">Email address</label>
          </div>
          <div className="form-floating mb-3">
            <input type="password" name="password" className="form-control" id="floatingPassword" placeholder="Password" onChange={handleChange} required />
            <label htmlFor="floatingPassword">Password</label>
          </div>
          <div className="form-floating mb-3">
            <input type="tel" name="phone" className="form-control" id="floatingPhone" placeholder="Phone Number" onChange={handleChange} />
            <label htmlFor="floatingPhone">Phone Number (Indian, 10 digits)</label>
            <small className="text-muted">Required for online payments via Razorpay</small>
          </div>
          <div className="form-floating mb-3">
            <input type="text" name="address" className="form-control" id="floatingAddress" placeholder="Business Address" onChange={handleChange} />
            <label htmlFor="floatingAddress">Business Address</label>
          </div>
          <div className="form-floating mb-4">
            <input type="text" name="gstNumber" className="form-control" id="floatingGst" placeholder="GSTIN" onChange={handleChange} />
            <label htmlFor="floatingGst">GSTIN (optional)</label>
          </div>
          <button className="btn btn-primary w-100 mb-3 py-2">Create Account</button>
        </form>

        <p className="mt-3 text-center small mb-0">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
export default Register;
