import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import billoraLogo from "../src/assets/billora.png";
import ThemeToggle from "../src/components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";

function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const limit = 10;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const markPaid = async (id) => {
    try {
      await API.put(`/invoices/${id}/paid`);
      fetchInvoices(page);
    } catch (error) {
      alert(t("dashboard.errStatus"));
    }
  };

  const fetchInvoices = async (currentPage = page, search = searchTerm, status = statusFilter, start = startDate, end = endDate) => {
    const params = new URLSearchParams({ page: currentPage, limit });
    if (search && search.trim()) params.append("search", search.trim());
    if (status && status !== "all") params.append("status", status);
    if (start) params.append("startDate", start);
    if (end) params.append("endDate", end);
    const res = await API.get(`/invoices?${params.toString()}`);
    setInvoices(res.data.invoices);
    setTotalPages(res.data.totalPages);
    setTotal(res.data.total);
  };

  const fetchUsage = async () => {
    const res = await API.get("/invoices/usage");
    setUsage(res.data);
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
    fetchInvoices(1);
    fetchUsage();
    fetchProfile();

    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const now = new Date();
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(now.getDate() - 15);

  const recentInvoices = invoices.filter((invoice) => {
    if (!invoice.createdAt) return false;
    const created = new Date(invoice.createdAt);
    return !Number.isNaN(created.getTime()) && created >= fifteenDaysAgo;
  });

  const totalRevenue = recentInvoices.reduce(
    (acc, invoice) => acc + (Number(invoice.totalAmount) || 0),
    0
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("dashboard.deleteConfirm"))) return;
    try {
      const res = await API.delete(`/invoices/${id}`);
      if (res.status === 200 || res.status === 404) {
        fetchInvoices(page);
        fetchUsage();
      }
    } catch (error) {
      if (error.response?.status === 404) {
        fetchInvoices(page);
        fetchUsage();
        return;
      }
      alert(error.response?.data?.message || t("dashboard.errDelete"));
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await API.get(`/invoices/${id}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert(t("dashboard.errDownload"));
    }
  };

  const openRazorpayCheckout = async (plan) => {
    try {
      if (typeof window.Razorpay === "undefined") {
        alert(t("dashboard.errPaymentLoading"));
        return;
      }

      const { data: orderData } = await API.post("/payments/create-order", { plan });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Billora",
        description: `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const { data } = await API.post("/payments/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            });
            alert(data.message);
            window.location.reload();
          } catch (error) {
            alert(error.response?.data?.message || t("dashboard.errPaymentVerify"));
          }
        },
        prefill: {
          name: profile?.businessName || "Billora User",
          email: profile?.email || "test@billora.com",
          contact: profile?.phone || "9876543210",
          country: "IN",
        },
        config: {
          display: {
            blocks: {
              utib: {
                name: "Pay using UPI",
                instruments: [
                  { method: "upi" },
                ],
              },
            },
            sequence: ["block.utib"],
            preferences: {
              show_default_blocks: true,
            },
          },
          readonly: {
            contact: true,
            email: true,
            name: true,
          },
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: () => {},
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert(error.response?.data?.message || t("dashboard.errPaymentInit"));
    }
  };

  const getValidPhone = () => {
    if (!profile?.phone) return "";
    const cleaned = profile.phone.replace(/[\s\-()]/g, "");
    if (/^[6-9]\d{9}$/.test(cleaned)) return cleaned;
    if (/^91[6-9]\d{9}$/.test(cleaned)) return cleaned;
    if (/^\+91[6-9]\d{9}$/.test(cleaned)) return cleaned;
    return "";
  };

  const openRazorpayInvoiceCheckout = async (invoiceId) => {
    try {
      if (typeof window.Razorpay === "undefined") {
        alert(t("dashboard.errPaymentLoading"));
        return;
      }

      const { data: orderData } = await API.post("/payments/create-invoice-order", { invoiceId });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Billora",
        description: `Pay Invoice ${orderData.invoiceNumber}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const { data } = await API.post("/payments/verify-invoice-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId,
            });
            alert(data.message);
            fetchInvoices(page);
            fetchUsage();
          } catch (error) {
            alert(error.response?.data?.message || t("dashboard.errPaymentVerify"));
          }
        },
        prefill: {
          name: profile?.businessName || "Billora User",
          email: profile?.email || "test@billora.com",
          contact: profile?.phone || "9876543210",
          country: "IN",
        },
        config: {
          display: {
            blocks: {
              utib: {
                name: "Pay using UPI",
                instruments: [
                  { method: "upi" },
                ],
              },
            },
            sequence: ["block.utib"],
            preferences: {
              show_default_blocks: true,
            },
          },
          readonly: {
            contact: true,
            email: true,
            name: true,
          },
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: () => {},
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      alert(error.response?.data?.message || t("dashboard.errPaymentInit"));
    }
  };

  const handleUpgradeBasic = () => openRazorpayCheckout("basic");
  const handleUpgradePro = () => openRazorpayCheckout("pro");

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
                style={{
                  width: "46px",
                  height: "46px",
                  objectFit: "contain",
                }}
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
                color: "var(--brand)"
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--success)"
              }} />
              {profile?.businessName || t("common.business")}
            </div>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => navigate("/payment-history")}
            >
              {t("dashboard.payments")}
            </button>
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleLogout}
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </nav>

      <main className="app-shell py-4">
        <div className="dashboard-header d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <p className="metric-label mb-2">{t("dashboard.metric")}</p>
            <h1 className="fw-bold mb-1">
              {t("dashboard.welcome")}{profile?.businessName ? `, ${profile.businessName}` : ""}
            </h1>
            <p className="text-soft mb-0">{t("dashboard.welcomeDesc")}</p>
          </div>
          <button
            className="btn btn-primary px-4 py-2"
            onClick={() => navigate("/create-invoice")}
          >
            {t("dashboard.createInvoice")}
          </button>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="stat-card brand-accent p-4">
              <p className="metric-label mb-2">{t("dashboard.currentPlan")}</p>
              <p className="metric-value">{usage?.plan ? usage.plan.toUpperCase() : "-"}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card success-accent p-4">
              <p className="metric-label mb-2">{t("dashboard.invoicesUsed")}</p>
              <p className="metric-value">
                {usage
                  ? usage.plan === "pro"
                    ? usage.used
                    : `${usage.used}/${usage.limit}`
                  : "-"}
              </p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card warning-accent p-4">
              <p className="metric-label mb-2">{t("dashboard.revenue15")}</p>
              <p className="metric-value">&#8377;{totalRevenue.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card info-accent p-4">
              <p className="metric-label mb-2">{t("dashboard.totalInvoices")}</p>
              <p className="metric-value">{total}</p>
            </div>
          </div>
        </div>

        <div className="summary-card p-4 mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h5 className="fw-bold mb-1">{t("dashboard.planControls")}</h5>
              <p className="text-soft small mb-0">
                {t("dashboard.remaining")}{" "}
                {usage?.plan === "pro" ? t("dashboard.unlimited") : usage?.remaining ?? "-"}
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {usage?.plan === "free" && (
                <>
                  <button className="btn btn-outline-warning btn-sm" onClick={handleUpgradeBasic}>
                    {t("dashboard.basicPlan")}
                  </button>
                  <button className="btn btn-warning btn-sm" onClick={handleUpgradePro}>
                    {t("dashboard.proPlan")}
                  </button>
                </>
              )}
              {usage?.plan === "basic" && (
                <button className="btn btn-warning btn-sm" onClick={handleUpgradePro}>
                  {t("dashboard.upgradePro")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modern-card table-card bg-white">
          <div className="px-4 pt-4 pb-3 border-bottom">
            <h5 className="fw-bold mb-2">{t("dashboard.invoices")}</h5>
            <div className="d-flex flex-wrap gap-3 align-items-end justify-content-center">
              <div style={{ maxWidth: 280, width: "100%" }}>
                <label className="form-label small text-soft">{t("dashboard.search")}</label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingRight: searchTerm ? 32 : 12 }}
                    placeholder={t("dashboard.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setPage(1);
                        fetchInvoices(1, searchTerm, statusFilter, startDate, endDate);
                      }
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="position-absolute d-flex align-items-center justify-content-center"
                      style={{
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--muted)",
                        fontSize: "1rem",
                        cursor: "pointer",
                        lineHeight: 1,
                      }}
                      onClick={() => {
                        setSearchTerm("");
                        setPage(1);
                        fetchInvoices(1, "", statusFilter, startDate, endDate);
                      }}
                    >
                      &#10005;
                    </button>
                  )}
                </div>
              </div>
              <div style={{ minWidth: 120 }}>
                <label className="form-label small text-soft">{t("dashboard.status")}</label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                    fetchInvoices(1, searchTerm, e.target.value, startDate, endDate);
                  }}
                >
                  <option value="all">{t("common.all")}</option>
                  <option value="Paid">{t("common.paid")}</option>
                  <option value="Unpaid">{t("common.unpaid")}</option>
                </select>
              </div>
              <div style={{ minWidth: 150 }}>
                <label className="form-label small text-soft">{t("dashboard.from")}</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                    fetchInvoices(1, searchTerm, statusFilter, e.target.value, endDate);
                  }}
                />
              </div>
              <div style={{ minWidth: 150 }}>
                <label className="form-label small text-soft">{t("dashboard.to")}</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                    fetchInvoices(1, searchTerm, statusFilter, startDate, e.target.value);
                  }}
                />
              </div>
              <div>
                <label className="form-label small text-soft">&nbsp;</label>
                <div>
                  <span className="badge-plan">{total} {t("common.total")}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{t("dashboard.invoiceNo")}</th>
                  <th>{t("dashboard.customer")}</th>
                  <th>{t("dashboard.items")}</th>
                  <th>{t("dashboard.amount")}</th>
                  <th>{t("dashboard.statusLabel")}</th>
                  <th className="text-end">{t("dashboard.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-soft py-5">
                      <div className="empty-state">
                        <div className="empty-state-icon">&#128196;</div>
                        <p className="mb-0">{t("dashboard.empty")}</p>
                      </div>
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td className="fw-semibold">{inv.invoiceNumber}</td>
                    <td>{inv.customerName}</td>
                    <td>
                      {inv.items.map((item, index) => (
                        <div key={index} style={{ fontSize: "0.875rem" }}>
                          {item.itemType} <span className="text-soft">(x{item.quantity})</span>
                        </div>
                      ))}
                    </td>
                    <td className="fw-bold" style={{ color: "var(--ink)" }}>
                      &#8377;{Number(inv.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className={inv.status === "Paid" ? "invoice-status-paid" : "invoice-status-unpaid"}>
                        {inv.status || t("common.unpaid")}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2 justify-content-end">
                        {inv.status !== "Paid" && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => openRazorpayInvoiceCheckout(inv._id)}
                            title={t("dashboard.payOnline")}
                          >
                            &#128176; {t("common.pay")}
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleDownload(inv._id)}
                          title={t("dashboard.downloadPdf")}
                        >
                          &#128196; {t("common.pdf")}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/edit-invoice/${inv._id}`)}
                          title={t("dashboard.editInvoice")}
                        >
                          &#9998; {t("common.edit")}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(inv._id)}
                          title={t("dashboard.deleteInvoice")}
                        >
                          &#128465;
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
              <small className="text-soft">
                {t("common.page")} {page} {t("common.of")} {totalPages}
              </small>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page === 1}
                  onClick={() => {
                    setPage(page - 1);
                    fetchInvoices(page - 1);
                  }}
                >
                  {t("common.previous")}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage(page + 1);
                    fetchInvoices(page + 1);
                  }}
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-4">
        <div className="app-shell small text-soft">&copy; {new Date().getFullYear()} Billora</div>
      </footer>
    </div>
  );
}

export default Dashboard;
