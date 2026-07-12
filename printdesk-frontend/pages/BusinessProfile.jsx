import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function BusinessProfile() {
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/business/profile");
        setBusinessName(res.data.businessName || "");
        setPhone(res.data.phone || "");
        setAddress(res.data.address || "");
        setGstNumber(res.data.gstNumber || "");
        setLogoUrl(res.data.logoUrl || "");
      } catch (error) {
        console.log(error);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.put("/business/profile", {
        businessName,
        phone,
        address,
        gstNumber,
      });

      alert("Profile Updated Successfully");
    } catch (error) {
      alert("Error updating profile");
    }
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoFile) {
      alert("Please select a logo file first");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const res = await API.post("/business/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setLogoUrl(res.data.logoUrl);
      alert("Logo updated successfully");
    } catch (error) {
      alert("Error uploading logo");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="mb-1 text-primary">Billora</h5>
            <small className="text-muted d-block mb-1">
              Smart Billing for Growing Businesses
            </small>
            <h3 className="mb-0">{businessName || "Your Business"}</h3>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-3"
            placeholder="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />

          <input
            className="form-control mb-3"
            placeholder="Phone Number (Indian, 10 digits)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <small className="text-muted d-block mb-3" style={{ marginTop: "-8px" }}>
            Required for online payments via Razorpay
          </small>

          <textarea
            className="form-control mb-3"
            placeholder="Business Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <input
            className="form-control mb-3"
            placeholder="GST Number"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
          />

          <button className="btn btn-primary mb-3">
            Save Profile
          </button>
        </form>

        <hr />

        <h5>Business Logo</h5>
        {logoUrl && (
          <div className="mb-3">
            <img
              src={`http://localhost:5000${logoUrl}`}
              alt="Business Logo"
              style={{ maxHeight: "80px" }}
            />
          </div>
        )}

        <form onSubmit={handleLogoUpload}>
          <input
            type="file"
            accept="image/*"
            className="form-control mb-3"
            onChange={handleLogoChange}
          />
          <button className="btn btn-secondary">
            Upload Logo
          </button>
        </form>
      </div>
    </div>
  );
}

export default BusinessProfile;