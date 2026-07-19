import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";
import useInvoiceForm from "../hooks/useInvoiceForm";
import InvoiceFormHeader from "../components/InvoiceFormHeader";
import InvoiceItemRows from "../components/InvoiceItemRows";
import InvoiceSummary from "../components/InvoiceSummary";

function EditInvoice() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [status, setStatus] = useState("Unpaid");

  const {
    items, setItems, gstPercent, setGstPercent, discount, setDiscount,
    handleItemChange, addItem, removeItem,
    subtotal, gstAmount, discountAmount, totalAmount, validate,
  } = useInvoiceForm([]);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await API.get(`/invoices/${id}`);
        const data = res.data;
        setCustomerName(data.customerName);
        setCustomerPhone(data.customerPhone);
        setItems(data.items);
        setStatus(data.status || "Unpaid");
        setGstPercent(data.gstPercent || 18);
        setDiscount(data.discount || 0);
      } catch (error) {
        alert(t("editInvoice.errLoad"));
      }
    };
    fetchInvoice();
  }, [id]);

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
      await API.put(`/invoices/${id}`, {
        customerName,
        customerPhone,
        items,
        status,
        gstPercent,
        discount,
      });
      alert(t("editInvoice.success"));
      navigate("/dashboard");
    } catch (error) {
      alert(t("editInvoice.errUpdate"));
    }
  };

  return (
    <div className="invoice-page">
      <div className="invoice-form-card bg-white p-4 p-md-5">
        <InvoiceFormHeader
          metric={t("editInvoice.metric")}
          title={t("editInvoice.title")}
          onClose={() => navigate(-1)}
        />

        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label">{t("createInvoice.customerName")}</label>
              <input
                className="form-control"
                placeholder={t("createInvoice.customerNamePlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t("createInvoice.customerPhone")}</label>
              <input
                className="form-control"
                placeholder={t("createInvoice.customerPhonePlaceholder")}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t("editInvoice.status")}</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Unpaid">{t("unpaid")}</option>
                <option value="Paid">{t("paid")}</option>
              </select>
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
            {t("editInvoice.update")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditInvoice;
