import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import API from "../services/api";
import billoraLogo from "../src/assets/billora.png";
import ThemeToggle from "../src/components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";

function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editingForm, setEditingForm] = useState({
    businessName: "",
    email: "",
    plan: "free",
    invoiceLimit: 30,
  });
  const [loading, setLoading] = useState(false);
  const [invoiceModalUser, setInvoiceModalUser] = useState(null);
  const [invoiceModalInvoices, setInvoiceModalInvoices] = useState([]);
  const [invoiceModalLoading, setInvoiceModalLoading] = useState(false);
  const [invoiceModalPage, setInvoiceModalPage] = useState(1);
  const [invoiceModalTotalPages, setInvoiceModalTotalPages] = useState(1);
  const [invoiceModalTotal, setInvoiceModalTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsTypeFilter, setPaymentsTypeFilter] = useState("all");
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsUserFilter, setPaymentsUserFilter] = useState(null);
  const [paymentsFadeKey, setPaymentsFadeKey] = useState(0);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchPayments = async (page = 1, type = "all", userId = null) => {
    setPaymentsLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (type && type !== "all") params.append("type", type);
    if (userId) params.append("userId", userId);
    try {
      const url = userId
        ? `/admin/users/${userId}/payments?${params.toString()}`
        : `/admin/payments?${params.toString()}`;
      const { data } = await API.get(url);
      setPayments(data.payments);
      setPaymentsTotalPages(data.totalPages);
      setPaymentsTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch payments", error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const openAllPaymentsModal = () => {
    setPaymentsUserFilter(null);
    setPaymentsTypeFilter("all");
    setPaymentsPage(1);
    setPaymentsModalOpen(true);
    fetchPayments(1, "all", null);
  };

  const openUserPaymentsModal = (user) => {
    setPaymentsUserFilter(user._id);
    setPaymentsTypeFilter("all");
    setPaymentsPage(1);
    setPaymentsModalOpen(true);
    fetchPayments(1, "all", user._id);
  };

  const closePaymentsModal = () => {
    setPaymentsModalOpen(false);
    setPayments([]);
    setPaymentsUserFilter(null);
    setPaymentsPage(1);
  };

  const fetchStats = async () => {
    const res = await API.get("/admin/stats");
    setStats(res.data);
  };

  const fetchUsers = async (page = usersPage, search = searchTerm, plan = selectedPlanFilter, start = startDate, end = endDate) => {
    const params = new URLSearchParams({ page, limit: 10 });
    if (search && search.trim()) params.append("search", search.trim());
    if (plan && plan !== "all") params.append("plan", plan);
    if (start) params.append("startDate", start);
    if (end) params.append("endDate", end);
    const res = await API.get(`/admin/users?${params.toString()}`);
    setUsers(res.data.users);
    setUsersTotalPages(res.data.totalPages);
    setUsersTotal(res.data.total);
  };

  useEffect(() => {
    fetchStats();
    fetchUsers(1, "", "all", "", "");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Delete this user and all invoices?")) return;

    setLoading(true);
    try {
      await API.delete(`/admin/users/${id}`);
      fetchUsers(usersPage, searchTerm, selectedPlanFilter, startDate, endDate);
      fetchStats();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to delete user";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const openEditUser = (user) => {
    const normalisedPlan = (user.plan || "free").toLowerCase();
    const initialLimit =
      normalisedPlan === "pro"
        ? ""
        : user.invoiceLimit ?? (normalisedPlan === "basic" ? 200 : 30);

    setEditingUser(user);
    setEditingForm({
      businessName: user.businessName || "",
      email: user.email || "",
      plan: normalisedPlan,
      invoiceLimit: initialLimit,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditingForm((prev) => {
      if (name === "plan") {
        const newPlan = value;
        let newLimit;
        if (newPlan === "free") {
          newLimit = 30;
        } else if (newPlan === "basic") {
          newLimit = 200;
        } else {
          newLimit = "";
        }
        return {
          ...prev,
          plan: newPlan,
          invoiceLimit: newLimit,
        };
      }

      if (name === "invoiceLimit") {
        return {
          ...prev,
          invoiceLimit: value === "" ? "" : Number(value),
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      const payloadInvoiceLimit =
        editingForm.plan === "pro" || editingForm.invoiceLimit === ""
          ? undefined
          : Number(editingForm.invoiceLimit);

      const { data } = await API.put(`/admin/users/${editingUser._id}`, {
        businessName: editingForm.businessName,
        email: editingForm.email,
        plan: editingForm.plan,
        invoiceLimit: payloadInvoiceLimit,
      });

      setUsers((prev) =>
        prev.map((u) => (u._id === data._id ? data : u))
      );
      setEditingUser(null);
      fetchStats();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to update user";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const openInvoicesModal = async (user, page = 1) => {
    setInvoiceModalUser(user);
    setInvoiceModalPage(page);
    setInvoiceModalLoading(true);
    if (page === 1) setInvoiceModalInvoices([]);
    try {
      const { data } = await API.get(
        `/admin/users/${user._id}/invoices?page=${page}&limit=10`
      );
      setInvoiceModalInvoices(data.invoices || []);
      setInvoiceModalTotalPages(data.totalPages || 1);
      setInvoiceModalTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      const msg = error.response?.data?.message || "Failed to fetch invoices";
      alert(msg);
    } finally {
      setInvoiceModalLoading(false);
    }
  };

  const closeInvoicesModal = () => {
    setInvoiceModalUser(null);
    setInvoiceModalInvoices([]);
    setInvoiceModalPage(1);
    setInvoiceModalTotalPages(1);
    setInvoiceModalTotal(0);
  };

  const handleDownloadInvoicePdf = async (user, invoiceId) => {
    try {
      const response = await API.get(
        `/admin/users/${user._id}/invoices/${invoiceId}/pdf`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `invoice-${invoiceId}-${user.businessName || "business"}.pdf`
      );
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("Failed to download invoice PDF");
    }
  };

  const handleDownloadUserSummaryPdf = async (user) => {
    try {
      const response = await API.get(
        `/admin/users/${user._id}/summary-pdf`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `user-summary-${user.businessName || "business"}.pdf`
      );
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("Failed to download user summary PDF");
    }
  };

  const handleDownloadPaymentsPdf = async () => {
    try {
      const url = paymentsUserFilter
        ? `/admin/users/${paymentsUserFilter}/payments-pdf`
        : `/admin/payments-all-pdf`;
      const response = await API.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        paymentsUserFilter
          ? `payments-${paymentsUserFilter}.pdf`
          : `all-payments.pdf`
      );
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("Failed to download payments PDF");
    }
  };

  const handleDownloadSinglePaymentPdf = async (paymentId) => {
    try {
      const response = await API.get(
        `/admin/payments/${paymentId}/pdf`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payment-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      alert("Failed to download payment receipt");
    }
  };

  const filteredUsers = users;

  return (
    <div className="app-page">
      {/* Top Navbar */}
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
              <small className="text-soft" style={{ fontSize: "0.75rem" }}>
                {t("common.admin")}
              </small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={openAllPaymentsModal}
            >
              {t("admin.allPayments")}
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
        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="stat-card brand-accent p-4">
              <p className="metric-label mb-2">{t("admin.totalUsers")}</p>
              <p className="metric-value">{stats.totalUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card success-accent p-4">
              <p className="metric-label mb-2">{t("admin.freeUsers")}</p>
              <p className="metric-value">{stats.freeUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card warning-accent p-4">
              <p className="metric-label mb-2">{t("admin.basicUsers")}</p>
              <p className="metric-value">{stats.basicUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card info-accent p-4">
              <p className="metric-label mb-2">{t("admin.proUsers")}</p>
              <p className="metric-value">{stats.proUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6 mt-md-3">
            <div className="stat-card danger-accent p-4">
              <p className="metric-label mb-2">{t("admin.totalInvoices")}</p>
              <p className="metric-value">{stats.totalInvoices ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="filter-bar px-4 py-3 mb-4">
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="d-flex flex-wrap gap-2">
              {[
                { key: "all", label: t("common.all") },
                { key: "free", label: "Free" },
                { key: "basic", label: "Basic" },
                { key: "pro", label: "Pro" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm ${
                    selectedPlanFilter === key
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => {
                    setSelectedPlanFilter(key);
                    setUsersPage(1);
                    fetchUsers(1, searchTerm, key);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="position-relative" style={{ maxWidth: 280, width: "100%" }}>
              <span
                className="position-absolute"
                style={{
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  fontSize: "0.85rem",
                  pointerEvents: "none",
                }}
              >
                &#128269;
              </span>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: 36, paddingRight: searchTerm ? 32 : 12 }}
                placeholder={t("admin.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setUsersPage(1);
                    fetchUsers(1, e.target.value, selectedPlanFilter, startDate, endDate);
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="position-absolute d-flex align-items-center justify-content-center"
                  style={{
                    right: 8,
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
                    setUsersPage(1);
                    fetchUsers(1, "", selectedPlanFilter, startDate, endDate);
                  }}
                >
                  &#10005;
                </button>
              )}
            </div>
            <div style={{ minWidth: 140 }}>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setUsersPage(1);
                  fetchUsers(1, searchTerm, selectedPlanFilter, e.target.value, endDate);
                }}
                placeholder="From date"
              />
            </div>
            <div style={{ minWidth: 140 }}>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setUsersPage(1);
                  fetchUsers(1, searchTerm, selectedPlanFilter, startDate, e.target.value);
                }}
                placeholder="To date"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-table-wrapper">
          <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">{t("admin.allBusinesses")}</h5>
            <div className="d-flex align-items-center gap-3">
              {loading && (
                <span className="text-soft small">
                  <span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      border: "2px solid var(--brand)",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                      marginRight: 6,
                      verticalAlign: "middle",
                    }}
                  />
                  {t("admin.savingChanges")}
                </span>
              )}
              <span className="badge-plan">{usersTotal} {t("common.total")}</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{t("admin.business")}</th>
                  <th>{t("admin.email")}</th>
                  <th>{t("admin.plan")}</th>
                  <th>{t("admin.invoiceLimit")}</th>
                  <th>{t("admin.created")}</th>
                  <th className="text-center">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-soft py-5">
                      <div className="empty-state">
                        <div className="empty-state-icon">&#128100;</div>
                        <p className="mb-0">{t("admin.empty")}</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredUsers.map((user) => {
                  const normalisedPlan = (user.plan || "free").toLowerCase();
                  const isProPlan = normalisedPlan === "pro";
                  const displayLimit = isProPlan ? t("admin.unlimited") : user.invoiceLimit ?? "-";

                  const planColors = {
                    free: { color: "var(--brand)", bg: "rgba(79, 70, 229, 0.08)" },
                    basic: { color: "var(--warning)", bg: "rgba(245, 158, 11, 0.08)" },
                    pro: { color: "var(--success)", bg: "rgba(16, 185, 129, 0.08)" },
                  };
                  const pc = planColors[normalisedPlan] || planColors.free;

                  return (
                    <tr key={user._id}>
                      <td className="fw-semibold">{user.businessName}</td>
                      <td className="text-soft">{user.email}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: pc.color,
                            background: pc.bg,
                            textTransform: "capitalize",
                          }}
                        >
                          {normalisedPlan}
                        </span>
                      </td>
                      <td>{displayLimit}</td>
                      <td className="text-soft">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="text-center">
                        <div className="d-flex flex-wrap gap-2 justify-content-center">
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleDownloadUserSummaryPdf(user)}
                          >
                            {t("common.pdf")}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openEditUser(user)}
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openInvoicesModal(user)}
                          >
                            {t("admin.invoices")}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => openUserPaymentsModal(user)}
                          >
                            {t("admin.payments")}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {usersTotalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top">
              <small className="text-soft">
                {t("common.page")} {usersPage} {t("common.of")} {usersTotalPages}
              </small>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={usersPage === 1}
                  onClick={() => {
                    setUsersPage(usersPage - 1);
                    fetchUsers(usersPage - 1, searchTerm, selectedPlanFilter, startDate, endDate);
                  }}
                >
                  {t("common.previous")}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={usersPage === usersTotalPages}
                  onClick={() => {
                    setUsersPage(usersPage + 1);
                    fetchUsers(usersPage + 1, searchTerm, selectedPlanFilter, startDate, endDate);
                  }}
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 1050,
          }}
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white p-0"
            style={{
              maxWidth: 480,
              width: "calc(100% - 32px)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
              background: "var(--panel)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
            >
              <h5 className="fw-bold mb-0">{t("admin.editUser")}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setEditingUser(null)}
              />
            </div>
            <div className="p-4">
              <div className="mb-3">
                <label className="form-label">{t("admin.business")}</label>
                <input
                  type="text"
                  className="form-control"
                  name="businessName"
                  value={editingForm.businessName}
                  onChange={handleEditChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">{t("admin.email")}</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={editingForm.email}
                  onChange={handleEditChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">{t("admin.plan")}</label>
                <select
                  className="form-select"
                  name="plan"
                  value={editingForm.plan}
                  onChange={handleEditChange}
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">{t("admin.invoiceLimitLabel")}</label>
                <input
                  type="number"
                  className="form-control"
                  name="invoiceLimit"
                  min="0"
                  value={editingForm.invoiceLimit}
                  onChange={handleEditChange}
                />
              </div>
            </div>
            <div className="modal-footer d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setEditingUser(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveUser}
                disabled={loading}
              >
                {loading ? t("common.saving") : t("admin.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Invoices Modal */}
      {invoiceModalUser && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={closeInvoicesModal}
          />
          <div className="modal-dialog modal-lg" role="document" style={{ zIndex: 1051, position: "relative", margin: "1rem" }}>
            <div className="modal-content" style={{ borderRadius: "var(--radius-lg)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
              <div className="modal-header" style={{ flexShrink: 0 }}>
                <div>
                  <h5 className="modal-title fw-bold">{t("admin.invoices")}</h5>
                  <small className="text-soft d-block">
                    {invoiceModalUser.businessName} &mdash; {invoiceModalUser.email}
                  </small>
                </div>
              </div>
              <div className="modal-body p-4" style={{ overflowY: "auto", flex: "1 1 auto" }}>
                {invoiceModalLoading ? (
                  <div className="text-center py-4 text-soft">
                    <span
                      style={{
                        display: "inline-block",
                        width: 20,
                        height: 20,
                        border: "2px solid var(--brand)",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                    {t("admin.loadingInvoices")}
                  </div>
                ) : invoiceModalInvoices.length === 0 ? (
                  <div className="text-center py-4 text-soft">
                    {t("admin.noInvoices")}
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th>{t("admin.invoiceNo")}</th>
                            <th>{t("admin.customer")}</th>
                            <th>{t("admin.totalLabel")}</th>
                            <th>{t("admin.createdLabel")}</th>
                            <th className="text-end">{t("admin.download")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceModalInvoices.map((inv) => (
                            <tr key={inv._id}>
                              <td className="fw-semibold">{inv.invoiceNumber}</td>
                              <td>{inv.customerName}</td>
                              <td className="fw-bold">&#8377;{inv.totalAmount}</td>
                              <td className="text-soft">
                                {inv.createdAt
                                  ? new Date(inv.createdAt).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="text-end">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() =>
                                    handleDownloadInvoicePdf(
                                      invoiceModalUser,
                                      inv._id
                                    )
                                  }
                                >
                                  {t("common.pdf")}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {invoiceModalTotalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                        <small className="text-soft">
                          {t("common.page")} {invoiceModalPage} {t("common.of")} {invoiceModalTotalPages} &middot; {invoiceModalTotal} {t("common.total")}
                        </small>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled={invoiceModalPage === 1}
                            onClick={() =>
                              openInvoicesModal(invoiceModalUser, invoiceModalPage - 1)
                            }
                          >
                            {t("common.previous")}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled={invoiceModalPage === invoiceModalTotalPages}
                            onClick={() =>
                              openInvoicesModal(invoiceModalUser, invoiceModalPage + 1)
                            }
                          >
                            {t("common.next")}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeInvoicesModal}
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Modal */}
      {paymentsModalOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={closePaymentsModal}
          />
          <div className="modal-dialog modal-lg" role="document" style={{ zIndex: 1051, position: "relative", margin: "1rem" }}>
            <div className="modal-content" style={{ borderRadius: "var(--radius-lg)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
              <div className="modal-header" style={{ flexShrink: 0 }}>
                <div>
                  <h5 className="modal-title fw-bold">{t("admin.paymentHistory")}</h5>
                  <small className="text-soft d-block">
                    {paymentsUserFilter ? t("admin.userPayments") : t("admin.allPaymentsAcross")}
                  </small>
                </div>
              </div>
              <div className="modal-body p-4" style={{ overflowY: "auto", flex: "1 1 auto", padding: "1.5rem !important" }}>
                <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
                  {["all", "subscription", "invoice"].map((type) => (
                    <button
                      key={type}
                      className={`btn btn-sm ${paymentsTypeFilter === type ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => {
                        setPaymentsTypeFilter(type);
                        setPaymentsPage(1);
                        setPaymentsFadeKey((k) => k + 1);
                        fetchPayments(1, type, paymentsUserFilter);
                      }}
                    >
                      {type === "all" ? t("common.all") : type === "subscription" ? t("admin.subscription") : t("admin.invoiceType")}
                    </button>
                  ))}
                </div>
                {paymentsLoading ? (
                  <div className="text-center py-4 text-soft">
                    <span
                      style={{
                        display: "inline-block",
                        width: 20,
                        height: 20,
                        border: "2px solid var(--brand)",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                    {t("admin.loadingPayments")}
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-4 text-soft fade-slide-in">
                    {t("admin.noPayments")}
                  </div>
                ) : (
                  <div key={paymentsFadeKey} className="fade-slide-in">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th>{t("admin.date")}</th>
                            {!paymentsUserFilter && <th>{t("admin.business")}</th>}
                            <th className="text-center">{t("admin.type")}</th>
                            <th>{t("admin.amount")}</th>
                            <th>{t("admin.invoiceLabel")}</th>
                            <th>{t("admin.planLabel")}</th>
                            <th className="text-center">{t("admin.statusLabel")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p._id}>
                              <td style={{ whiteSpace: "nowrap" }}>
                                {new Date(p.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              {!paymentsUserFilter && (
                                <td>
                                  {p.businessId
                                    ? `${p.businessId.businessName || "-"}`
                                    : "-"}
                                </td>
                              )}
                              <td className="text-center">
                                <span className={p.type === "subscription" ? "badge-plan" : "badge-type-invoice"}>
                                  {p.type === "subscription" ? t("admin.subscription") : t("admin.invoiceType")}
                                </span>
                              </td>
                              <td className="fw-bold">
                                {"\u20B9"}{Number(p.amount).toLocaleString("en-IN")}
                              </td>
                              <td>
                                {p.invoiceId
                                  ? `${p.invoiceId.invoiceNumber || "-"}`
                                  : "-"}
                              </td>
                              <td>
                                {p.plan ? p.plan.charAt(0).toUpperCase() + p.plan.slice(1) : "-"}
                              </td>
                              <td className="text-center">
                                <span className="invoice-status-paid">{p.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {paymentsTotalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                        <small className="text-soft">
                          {t("common.page")} {paymentsPage} {t("common.of")} {paymentsTotalPages} &middot; {paymentsTotal} {t("common.total")}
                        </small>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled={paymentsPage === 1}
                            onClick={() => {
                              setPaymentsPage(paymentsPage - 1);
                              fetchPayments(paymentsPage - 1, paymentsTypeFilter, paymentsUserFilter);
                            }}
                          >
                            {t("common.previous")}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled={paymentsPage === paymentsTotalPages}
                            onClick={() => {
                              setPaymentsPage(paymentsPage + 1);
                              fetchPayments(paymentsPage + 1, paymentsTypeFilter, paymentsUserFilter);
                            }}
                          >
                            {t("common.next")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closePaymentsModal}
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(16px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes rowFadeIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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
        .modal-content {
          animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .modal-backdrop {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
