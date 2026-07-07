import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import billoraLogo from "../src/assets/billora.png";

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

  const navigate = useNavigate();

  const fetchStats = async () => {
    const res = await API.get("/admin/stats");
    setStats(res.data);
  };

  const fetchUsers = async () => {
    const res = await API.get("/admin/users");
    setUsers(res.data);
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
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
      await Promise.all([fetchUsers(), fetchStats()]);
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
      await fetchStats();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to update user";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const openInvoicesModal = async (user) => {
    setInvoiceModalUser(user);
    setInvoiceModalLoading(true);
    setInvoiceModalInvoices([]);
    try {
      const { data } = await API.get(`/admin/users/${user._id}/invoices`);
      setInvoiceModalInvoices(data);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to fetch invoices";
      alert(msg);
    } finally {
      setInvoiceModalLoading(false);
    }
  };

  const closeInvoicesModal = () => {
    setInvoiceModalUser(null);
    setInvoiceModalInvoices([]);
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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const normalisedPlan = (user.plan || "free").toLowerCase();

      const matchesPlan =
        selectedPlanFilter === "all" ||
        normalisedPlan === selectedPlanFilter;

      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        user.businessName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term);

      return matchesPlan && matchesSearch;
    });
  }, [users, selectedPlanFilter, searchTerm]);

  return (
    <div className="app-page">
      {/* Top Navbar */}
      <nav className="app-nav">
        <div className="app-shell d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{ width: 44, height: 44 }}
            >
              <img
                src={billoraLogo}
                alt="Billora Logo"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                }}
              />
            </div>
            <div>
              <div className="brand-title fs-5">Billora Admin</div>
              <small className="text-soft" style={{ fontSize: "0.75rem" }}>
                Control panel for all businesses
              </small>
            </div>
          </div>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="app-shell py-4">
        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="stat-card brand-accent p-4">
              <p className="metric-label mb-2">Total Users</p>
              <p className="metric-value">{stats.totalUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card success-accent p-4">
              <p className="metric-label mb-2">Free Users</p>
              <p className="metric-value">{stats.freeUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card warning-accent p-4">
              <p className="metric-label mb-2">Basic Users</p>
              <p className="metric-value">{stats.basicUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card info-accent p-4">
              <p className="metric-label mb-2">Pro Users</p>
              <p className="metric-value">{stats.proUsers ?? 0}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6 mt-md-3">
            <div className="stat-card danger-accent p-4">
              <p className="metric-label mb-2">Total Invoices</p>
              <p className="metric-value">{stats.totalInvoices ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="filter-bar p-3 mb-4">
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="d-flex flex-wrap gap-2">
              {[
                { key: "all", label: "All", count: filteredUsers.length },
                { key: "free", label: "Free", count: users.filter(u => u.plan === 'free').length },
                { key: "basic", label: "Basic", count: users.filter(u => u.plan === 'basic').length },
                { key: "pro", label: "Pro", count: users.filter(u => u.plan === 'pro').length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm ${
                    selectedPlanFilter === key
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => setSelectedPlanFilter(key)}
                >
                  {label} ({count})
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
                style={{ paddingLeft: 36 }}
                placeholder="Search by business or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-table-wrapper">
          <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">All Businesses</h5>
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
                Saving changes...
              </span>
            )}
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Invoice Limit</th>
                  <th>Created</th>
                  <th className="text-end" style={{ minWidth: 240 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-soft py-5">
                      <div className="empty-state">
                        <div className="empty-state-icon">&#128100;</div>
                        <p className="mb-0">No users found matching your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredUsers.map((user) => {
                  const normalisedPlan = (user.plan || "free").toLowerCase();
                  const isProPlan = normalisedPlan === "pro";
                  const displayLimit = isProPlan ? "Unlimited" : user.invoiceLimit ?? "-";

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
                      <td>
                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleDownloadUserSummaryPdf(user)}
                          >
                            PDF
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => openEditUser(user)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openInvoicesModal(user)}
                          >
                            Invoices
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="d-flex justify-content-between align-items-center p-4 border-bottom"
            >
              <h5 className="fw-bold mb-0">Edit User</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setEditingUser(null)}
              />
            </div>
            <div className="p-4">
              <div className="mb-3">
                <label className="form-label">Business Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="businessName"
                  value={editingForm.businessName}
                  onChange={handleEditChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={editingForm.email}
                  onChange={handleEditChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Plan</label>
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
                <label className="form-label">Invoice Limit</label>
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
            <div className="d-flex justify-content-end gap-2 p-4 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveUser}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Invoices Modal */}
      {invoiceModalUser && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content" style={{ borderRadius: "var(--radius-lg)" }}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Invoices</h5>
                  <small className="text-soft d-block">
                    {invoiceModalUser.businessName} &mdash; {invoiceModalUser.email}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeInvoicesModal}
                />
              </div>
              <div className="modal-body">
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
                    Loading invoices...
                  </div>
                ) : invoiceModalInvoices.length === 0 ? (
                  <div className="text-center py-4 text-soft">
                    No invoices found for this user.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Created</th>
                          <th className="text-end">Download</th>
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
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeInvoicesModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            onClick={closeInvoicesModal}
          />
        </div>
      )}

      {/* CSS for loading spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
