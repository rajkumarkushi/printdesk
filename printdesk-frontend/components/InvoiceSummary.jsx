import { useTranslation } from "react-i18next";

function InvoiceSummary({ gstPercent, setGstPercent, discount, setDiscount, subtotal, gstAmount, discountAmount, totalAmount }) {
  const { t } = useTranslation();

  return (
    <div className="summary-card p-4 mt-4">
      <h6 className="fw-bold mb-3">{t("createInvoice.summary")}</h6>
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <label className="form-label">{t("createInvoice.gstRate")}</label>
          <select
            className="form-select"
            value={gstPercent}
            onChange={(e) => setGstPercent(Number(e.target.value))}
          >
            <option value={0}>GST 0%</option>
            <option value={5}>GST 5%</option>
            <option value={12}>GST 12%</option>
            <option value={18}>GST 18%</option>
            <option value={28}>GST 28%</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">{t("createInvoice.discount")}</label>
          <input
            type="number"
            className="form-control"
            placeholder={t("createInvoice.discountPlaceholder")}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>
      </div>

      <div
        className="p-3 mt-2"
        style={{
          borderRadius: "var(--radius)",
          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.04), rgba(6, 182, 212, 0.04))",
          border: "1px solid var(--line)",
        }}
      >
        <div className="d-flex justify-content-between mb-2">
          <span className="text-soft">{t("createInvoice.subtotal")}</span>
          <span className="fw-semibold">&#8377;{subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span className="text-soft">{t("createInvoice.gst", { percent: gstPercent })}</span>
          <span className="fw-semibold">&#8377;{gstAmount.toLocaleString("en-IN")}</span>
        </div>
        {discount > 0 && (
          <div className="d-flex justify-content-between mb-3">
            <span className="text-soft">{t("createInvoice.discountLabel", { percent: discount })}</span>
            <span className="fw-semibold">&#8377;{discountAmount.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div
          className="d-flex justify-content-between pt-3"
          style={{ borderTop: "2px solid var(--line)" }}
        >
          <span className="metric-label mb-0">{t("createInvoice.total")}</span>
          <h4 className="fw-bold mb-0" style={{ color: "var(--brand)" }}>
            &#8377;{totalAmount.toLocaleString("en-IN")}
          </h4>
        </div>
      </div>
    </div>
  );
}

export default InvoiceSummary;
