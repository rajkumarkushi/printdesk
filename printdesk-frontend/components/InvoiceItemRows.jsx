import { useTranslation } from "react-i18next";

function InvoiceItemRows({ items, onItemChange, onAdd, onRemove }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">{t("createInvoice.items")}</h5>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onAdd}>
          {t("createInvoice.addItem")}
        </button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="item-row row g-3 align-items-end mb-3">
          <div className="col-md-3">
            <label className="form-label">{t("createInvoice.itemType")}</label>
            <input
              name="itemType"
              className="form-control"
              placeholder={t("createInvoice.itemTypePlaceholder")}
              value={item.itemType}
              onChange={(e) => onItemChange(index, e)}
              required
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("createInvoice.designName")}</label>
            <input
              name="designName"
              className="form-control"
              placeholder={t("createInvoice.designNamePlaceholder")}
              value={item.designName}
              onChange={(e) => onItemChange(index, e)}
              required
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t("createInvoice.qty")}</label>
            <input
              name="quantity"
              type="number"
              className="form-control"
              placeholder="1"
              value={item.quantity}
              onChange={(e) => onItemChange(index, e)}
              required
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t("createInvoice.price")}</label>
            <input
              name="price"
              type="number"
              className="form-control"
              placeholder="0"
              value={item.price}
              onChange={(e) => onItemChange(index, e)}
              required
            />
          </div>
          <div className="col-md-2">
            <button
              type="button"
              className="btn btn-outline-danger w-100"
              onClick={() => onRemove(index)}
              disabled={items.length === 1}
            >
              {t("createInvoice.remove")}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

export default InvoiceItemRows;
