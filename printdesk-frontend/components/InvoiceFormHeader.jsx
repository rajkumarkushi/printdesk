import ThemeToggle from "../src/components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";

function InvoiceFormHeader({ metric, title, onClose }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <p className="metric-label mb-1">{metric}</p>
        <h3 className="fw-bold mb-0">{title}</h3>
      </div>
      <div className="d-flex gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onClose}
        >
          &times; Close
        </button>
      </div>
    </div>
  );
}

export default InvoiceFormHeader;
