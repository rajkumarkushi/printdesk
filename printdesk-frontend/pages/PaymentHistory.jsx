import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API from "../services/api";
import billoraLogo from "../src/assets/billora.png";
import ThemeToggle from "../src/components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useProfile from "../hooks/useProfile";
import useAuth from "../hooks/useAuth";
import Pagination from "../components/Pagination";

function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [fadeKey, setFadeKey] = useState(0);
  const limit = 10;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const profile = useProfile();
  const { logout: handleLogout } = useAuth();

  const fetchPayments = async (currentPage = page, type = typeFilter) => {
    const params = new URLSearchParams({ page: currentPage, limit });
    if (type && type !== "all") params.append("type", type);
    const res = await API.get(`/payments/history?${params.toString()}`);
    setPayments(res.data.payments);
    setTotalPages(res.data.totalPages);
    setTotal(res.data.total);
  };

  useEffect(() => {
    fetchPayments(1);
  }, []);

  const formatAmount = (amount) => {
    return "\u20B9" + Number(amount).toLocaleString("en-IN");
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="app-page">
      <nav className="app-nav">
        <div className="app-shell d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center logo-wrap"
              style={{ width: 52, height: 52, borderRadius: 14 }}
            >
              <img
                src={billoraLogo}
                alt="Billora Logo"
                style={{ width: "46px", height: "46px", objectFit: "contain" }}
              />
            </div>
            <div>
              <div className="brand-title fs-5">Billora</div>
              <small className="text-soft" style={{ fontSize: "0.75rem" }}>{t("common.user")}</small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center gap-2 px-3 py-1"
              style={{
                borderRadius: "999px",
                background: "rgba(79, 70, 229, 0.06)",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--brand)",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
              {profile?.businessName || t("common.business")}
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
            <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
              {t("common.logout")}
            </button>
          </div>
        </div>
      </nav>

      <main className="app-shell py-4">
        <div className="dashboard-header d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <p className="metric-label mb-2">{t("payments.metric")}</p>
            <h1 className="fw-bold mb-1">{t("payments.title")}</h1>
            <p className="text-soft mb-0">{t("payments.subtitle")}</p>
          </div>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => navigate("/dashboard")}
          >
            {t("payments.backDashboard")}
          </button>
        </div>

        <div className="modern-card table-card bg-white">
          <div className="px-4 pt-4 pb-3 border-bottom">
            <div className="d-flex flex-wrap gap-3 align-items-end">
              <div style={{ minWidth: 150 }}>
                <label className="form-label small text-soft">{t("payments.type")}</label>
                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                    setFadeKey((k) => k + 1);
                    fetchPayments(1, e.target.value);
                  }}
                >
                  <option value="all">{t("common.all")}</option>
                  <option value="subscription">{t("payments.subscription")}</option>
                  <option value="invoice">{t("payments.invoiceType")}</option>
                </select>
              </div>
              <div>
                <label className="form-label small text-soft">&nbsp;</label>
                <div>
                  <span className="badge-plan">{total} {t("common.total")}</span>
                </div>
              </div>
            </div>
          </div>
          <div key={fadeKey} className="fade-slide-in">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{t("payments.date")}</th>
                    <th className="text-center">{t("payments.type")}</th>
                  <th>{t("payments.amount")}</th>
                  <th>{t("payments.invoiceLabel")}</th>
                  <th>{t("payments.planLabel")}</th>
                    <th className="text-center">{t("payments.statusLabel")}</th>
                  <th>{t("payments.razorpayId")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-soft py-5">
                      <div className="empty-state">
                        <div className="empty-state-icon">&#128176;</div>
                        <p className="mb-0">{t("payments.empty")}</p>
                      </div>
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(p.createdAt)}</td>
                    <td className="text-center">
                      <span className={p.type === "subscription" ? "badge-plan" : "badge-type-invoice"}>
                        {p.type === "subscription" ? t("payments.subscription") : t("payments.invoiceType")}
                      </span>
                    </td>
                    <td className="fw-bold" style={{ color: "var(--ink)" }}>
                      {formatAmount(p.amount)}
                    </td>
                    <td>
                      {p.invoiceId
                        ? `${p.invoiceId.invoiceNumber || "-"} (${p.invoiceId.customerName || "-"})`
                        : "-"}
                    </td>
                    <td>
                      {p.plan ? p.plan.charAt(0).toUpperCase() + p.plan.slice(1) : "-"}
                    </td>
                    <td className="text-center">
                      <span className="invoice-status-paid">{p.status}</span>
                    </td>
                    <td>
                      <small className="text-soft">{p.razorpayPaymentId || "-"}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => { setPage(p); fetchPayments(p); }}
          />
          </div>
        </div>
      </main>

      <footer className="py-4">
        <div className="app-shell small text-soft">&copy; {new Date().getFullYear()} Billora</div>
      </footer>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .fade-slide-in {
          animation: fadeSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fade-slide-in .table tbody tr {
          animation: rowFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .fade-slide-in .table tbody tr:nth-child(1) { animation-delay: 0.05s; }
        .fade-slide-in .table tbody tr:nth-child(2) { animation-delay: 0.1s; }
        .fade-slide-in .table tbody tr:nth-child(3) { animation-delay: 0.15s; }
        .fade-slide-in .table tbody tr:nth-child(4) { animation-delay: 0.2s; }
        .fade-slide-in .table tbody tr:nth-child(5) { animation-delay: 0.25s; }
        .fade-slide-in .table tbody tr:nth-child(6) { animation-delay: 0.3s; }
        .fade-slide-in .table tbody tr:nth-child(7) { animation-delay: 0.35s; }
        .fade-slide-in .table tbody tr:nth-child(8) { animation-delay: 0.4s; }
        .fade-slide-in .table tbody tr:nth-child(9) { animation-delay: 0.45s; }
        .fade-slide-in .table tbody tr:nth-child(10) { animation-delay: 0.5s; }
      `}</style>
    </div>
  );
}

export default PaymentHistory;
