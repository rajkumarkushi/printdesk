import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API from "../services/api";
import billoraLogo from "../src/assets/billora.png";

function UploadLogo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const selected = e.dataTransfer.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    try {
      await API.post(`/auth/register-logo/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || t("uploadLogo.error"));
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    navigate("/login");
  };

  return (
    <div className="auth-page">
      <div className="auth-card modern-card bg-white text-center">
        <div className="mb-4">
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
          <div className="brand-title fs-3 mb-1">{t("uploadLogo.title")}</div>
          <p className="text-soft mb-0 small">{t("uploadLogo.subtitle")}</p>
        </div>

        <div
          className={`upload-zone mb-4 p-4 border border-dashed rounded-3 position-relative ${
            dragActive ? "border-primary bg-light-subtle" : "border-secondary-subtle"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{ minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s ease" }}
          onClick={() => document.getElementById("logoInput").click()}
        >
          <input
            type="file"
            id="logoInput"
            className="d-none"
            accept=".png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
          {preview ? (
            <div className="position-relative">
              <img
                src={preview}
                alt="Logo Preview"
                className="img-thumbnail"
                style={{ maxHeight: 120, objectFit: "contain" }}
              />
              <button
                type="button"
                className="btn-close position-absolute top-0 start-100 translate-middle bg-white rounded-circle p-1 border shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                }}
              />
            </div>
          ) : (
            <div className="text-muted">
              <div className="fs-1 mb-2">&#128193;</div>
              <p className="mb-1 small fw-medium">{t("uploadLogo.drag")} <span className="text-primary">{t("uploadLogo.browse")}</span></p>
              <p className="mb-0 text-soft extra-small">{t("uploadLogo.support")}</p>
            </div>
          )}
        </div>

        <div className="d-flex gap-3 justify-content-center">
          <button
            className="btn btn-outline-secondary px-4 py-2 w-50"
            onClick={handleSkip}
            disabled={uploading}
          >
            {t("common.skip")}
          </button>
          <button
            className="btn btn-primary px-4 py-2 w-50"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? t("uploadLogo.uploading") : t("uploadLogo.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadLogo;
