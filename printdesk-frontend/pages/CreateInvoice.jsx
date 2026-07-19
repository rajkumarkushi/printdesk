import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import useInvoiceForm from "../hooks/useInvoiceForm";
import useProfile from "../hooks/useProfile";
import { openRazorpayCheckout } from "../services/razorpay";
import InvoiceFormHeader from "../components/InvoiceFormHeader";
import InvoiceItemRows from "../components/InvoiceItemRows";
import InvoiceSummary from "../components/InvoiceSummary";

function CreateInvoice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");

  const {
    items, gstPercent, setGstPercent, discount, setDiscount,
    handleItemChange, addItem, removeItem,
    subtotal, gstAmount, discountAmount, totalAmount, validate,
  } = useInvoiceForm();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert(t("createInvoice.errName"));
      return;
    }
    if (!customerPhone.trim()) {
      alert(t("createInvoice.errPhone"));
      return;
    }

    const itemError = validate(t);
    if (itemError) {
      alert(itemError);
      return;
    }

    try {
      await API.post("/invoices", {
        customerName,
        customerPhone,
        items,
        gstPercent,
        discount,
      });

      alert(t("createInvoice.success"));
      navigate("/dashboard");
    } catch (error) {
      const msg = error.response?.data?.message || t("createInvoice.errCreate");
      if (error.response?.status === 403) {
        setLimitMessage(msg);
        setShowUpgrade(true);
      } else {
        alert(msg);
      }
    }
  };

  return (
    <div className="invoice-page">
      <div className="invoice-form-card bg-white p-4 p-md-5">
        <InvoiceFormHeader
          metric={t("createInvoice.metric")}
          title={t("createInvoice.title")}
          onClose={() => navigate(-1)}
        />

        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label">{t("createInvoice.customerName")}</label>
              <input
                className="form-control"
                placeholder={t("createInvoice.customerNamePlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t("createInvoice.customerPhone")}</label>
              <input
                className="form-control"
                placeholder={t("createInvoice.customerPhonePlaceholder")}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <InvoiceItemRows
            items={items}
            onItemChange={handleItemChange}
            onAdd={addItem}
            onRemove={removeItem}
          />

          <InvoiceSummary
            gstPercent={gstPercent}
            setGstPercent={setGstPercent}
            discount={discount}
            setDiscount={setDiscount}
            subtotal={subtotal}
            gstAmount={gstAmount}
            discountAmount={discountAmount}
            totalAmount={totalAmount}
          />

          <button className="btn btn-primary mt-4 px-5 py-2">
            {t("createInvoice.submit")}
          </button>
        </form>
      </div>

      {showUpgrade && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-4">
              <h5 className="fw-bold mb-2">{t("createInvoice.upgradeTitle")}</h5>
              <p className="text-soft mb-4">{limitMessage}</p>
              <div className="d-flex flex-column gap-3">
                <button className="btn btn-outline-warning w-100 py-2" onClick={() => openRazorpayCheckout({ plan: "basic", profile, t })}>
                  {t("dashboard.basicPlan")}
                </button>
                <button className="btn btn-warning w-100 py-2" onClick={() => openRazorpayCheckout({ plan: "pro", profile, t })}>
                  {t("dashboard.proPlan")}
                </button>
                <button className="btn btn-outline-secondary w-100" onClick={() => setShowUpgrade(false)}>
                  {t("close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateInvoice;
