import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import billoraLogo from "../src/assets/billora.png";
import ThemeToggle from "../src/components/ThemeToggle";

function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [fadeKey, setFadeKey] = useState(0);
  const [profile, setProfile] = useState(null);
  const limit = 10;
  const navigate = useNavigate();

  const fetchPayments = async (currentPage = page, type = typeFilter) => {
    const params = new URLSearchParams({ page: currentPage, limit });
    if (type && type !== "all") params.append("type", type);
    const res = await API.get(`/payments/history?${params.toString()}`);
    setPayments(res.data.payments);
    setTotalPages(res.data.totalPages);
    setTotal(res.data.total);
  };

  const fetchProfile = async () => {
    try {
      const res = await API.get("/business/profile");
      setProfile(res.data);
    } catch (error) {
      console.error("Failed to load business profile", error);
    }
  };

  useEffect(() => {
    fetchPayments(1);
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

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
              <small className="text-soft" style={{ fontSize: "0.75rem" }}>User</small>
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
              {profile?.businessName || "Business"}
            </div>
            <ThemeToggle />
            <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="app-shell py-4">
        <div className="dashboard-header d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <p className="metric-label mb-2">Payments</p>
            <h1 className="fw-bold mb-1">Payment History</h1>
            <p className="text-soft mb-0">View all your subscription and invoice payments.</p>
          </div>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="modern-card table-card bg-white">
          <div className="px-4 pt-4 pb-3 border-bottom">
            <div className="d-flex flex-wrap gap-3 align-items-end">
              <div style={{ minWidth: 150 }}>
                <label className="form-label small text-soft">Type</label>
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
                  <option value="all">All</option>
                  <option value="subscription">Subscription</option>
                  <option value="invoice">Invoice</option>
                </select>
              </div>
              <div>
                <label className="form-label small text-soft">&nbsp;</label>
                <div>
                  <span className="badge-plan">{total} total</span>
                </div>
              </div>
            </div>
          </div>
          <div key={fadeKey} className="fade-slide-in">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                    <th className="text-center">Type</th>
                  <th>Amount</th>
                  <th>Invoice</th>
                  <th>Plan</th>
                    <th className="text-center">Status</th>
                  <th>Razorpay Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-soft py-5">
                      <div className="empty-state">
                        <div className="empty-state-icon">&#128176;</div>
                        <p className="mb-0">No payments yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(p.createdAt)}</td>
                    <td className="text-center">
                      <span className={p.type === "subscription" ? "badge-plan" : "badge-type-invoice"}>
                        {p.type === "subscription" ? "Subscription" : "Invoice"}
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
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
              <small className="text-soft">
                Page {page} of {totalPages}
              </small>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page === 1}
                  onClick={() => {
                    setPage(page - 1);
                    fetchPayments(page - 1);
                  }}
                >
                  Previous
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage(page + 1);
                    fetchPayments(page + 1);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
