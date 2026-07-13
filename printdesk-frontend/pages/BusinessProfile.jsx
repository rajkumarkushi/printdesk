import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function BusinessProfile() {
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

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

      alert(t("profile.successUpdate"));
    } catch (error) {
      alert(t("profile.errUpdate"));
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
      alert(t("profile.errSelectLogo"));
      return;
    }

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const res = await API.post("/business/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setLogoUrl(res.data.logoUrl);
      alert(t("profile.successLogo"));
    } catch (error) {
      alert(t("profile.errUploadLogo"));
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="mb-1 text-primary">Billora</h5>
            <small className="text-muted d-block mb-1">
              {t("profile.title")}
            </small>
            <h3 className="mb-0">{businessName || t("profile.yourBusiness")}</h3>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            {t("common.close")}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-3"
            placeholder={t("profile.businessName")}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />

          <input
            className="form-control mb-3"
            placeholder={t("profile.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <small className="text-muted d-block mb-3" style={{ marginTop: "-8px" }}>
            {t("profile.phoneHelp")}
          </small>

          <textarea
            className="form-control mb-3"
            placeholder={t("profile.address")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <input
            className="form-control mb-3"
            placeholder={t("profile.gst")}
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value)}
          />

          <button className="btn btn-primary mb-3">
            {t("profile.saveProfile")}
          </button>
        </form>

        <hr />

        <h5>{t("profile.businessLogo")}</h5>
        {logoUrl && (
          <div className="mb-3">
            <img
              src={`${import.meta.env.VITE_API_URL?.replace("/api", "")}${logoUrl}`}
              alt="Business Logo"
              style={{ maxHeight: "80px" }}
            />
          </div>
        )}

        <form onSubmit={handleLogoUpload}>
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            className="form-control mb-3"
            onChange={handleLogoChange}
          />
          <button className="btn btn-secondary">
            {t("profile.uploadLogo")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BusinessProfile;
