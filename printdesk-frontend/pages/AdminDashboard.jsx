import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

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

    // For pro users, treat limit as "unlimited" in the form (leave blank).
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
      // When plan changes, reset invoice limit to sensible defaults
      if (name === "plan") {
        const newPlan = value;
        let newLimit;
        if (newPlan === "free") {
          newLimit = 30;
        } else if (newPlan === "basic") {
          newLimit = 200;
        } else {
          // pro – unlimited, don't send a hard limit
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
      // For pro users, don't send a giant number – leave limit undefined to mean unlimited.
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
      // Normalise plan: treat missing as "free" and compare in lowercase
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
    <div className="container-fluid p-0 min-vh-100 bg-light">
      {/* Top Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container-fluid px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center"
              style={{ width: 32, height: 32, fontWeight: 700 }}
            >
              B
            </div>
            <div>
              <span className="navbar-brand d-block mb-0">Billora Admin</span>
              <small className="text-light text-opacity-75">
                Control panel for all businesses
              </small>
            </div>
          </div>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container-fluid py-4">
        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">
                  Total Users
                </h6>
                <h3 className="mb-0">{stats.totalUsers ?? 0}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">
                  Free Users
                </h6>
                <h3 className="mb-0 text-primary">{stats.freeUsers ?? 0}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">
                  Basic Users
                </h6>
                <h3 className="mb-0 text-warning">{stats.basicUsers ?? 0}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">
                  Pro Users
                </h6>
                <h3 className="mb-0 text-success">{stats.proUsers ?? 0}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6 mt-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-muted text-uppercase small mb-1">
                  Total Invoices
                </h6>
                <h3 className="mb-0">{stats.totalInvoices ?? 0}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body d-flex flex-wrap gap-2 align-items-center justify-content-between">
            <div className="btn-group" role="group" aria-label="Plan filter">
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedPlanFilter === "all"
                    ? "btn-primary"
                    : "btn-outline-primary"
                }`}
                onClick={() => setSelectedPlanFilter("all")}
              >
                All ({filteredUsers.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedPlanFilter === "free"
                    ? "btn-primary"
                    : "btn-outline-primary"
                }`}
                onClick={() => setSelectedPlanFilter("free")}
              >
                Free ({users.filter(u => u.plan === 'free').length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedPlanFilter === "basic"
                    ? "btn-primary"
                    : "btn-outline-primary"
                }`}
                onClick={() => setSelectedPlanFilter("basic")}
              >
                Basic ({users.filter(u => u.plan === 'basic').length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  selectedPlanFilter === "pro"
                    ? "btn-primary"
                    : "btn-outline-primary"
                }`}
                onClick={() => setSelectedPlanFilter("pro")}
              >
                Pro ({users.filter(u => u.plan === 'pro').length})
              </button>
            </div>

            <div className="input-group input-group-sm" style={{ maxWidth: 280 }}>
              <span className="input-group-text bg-white">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by business or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">All Businesses</h5>
              {loading && (
                <span className="text-muted small">Saving changes...</span>
              )}
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Business</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Invoice Limit</th>
                    <th>Created</th>
                    <th style={{ width: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No users found.
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((user) => {
                    const normalisedPlan = (user.plan || "free").toLowerCase();
                    const isProPlan = normalisedPlan === "pro";
                    const displayLimit = isProPlan ? "Unlimited" : user.invoiceLimit ?? "-";

                    return (
                      <tr key={user._id}>
                        <td>{user.businessName}</td>
                        <td>{user.email}</td>
                        <td className="text-capitalize">{normalisedPlan}</td>
                        <td>{displayLimit}</td>
                        <td>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleDownloadUserSummaryPdf(user)}
                            >
                              User PDF
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
        </div>
      </div>

      {/* Edit User Modal (custom overlay to avoid backdrop blocking clicks) */}
      {editingUser && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          onClick={() => setEditingUser(null)}
        >
          <div
            className="card shadow"
            style={{ maxWidth: 500, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Edit User</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setEditingUser(null)}
              ></button>
            </div>
            <div className="card-body">
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
            <div className="card-footer d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
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
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Invoices</h5>
                  <small className="text-muted d-block">
                    {invoiceModalUser.businessName} &mdash; {invoiceModalUser.email}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeInvoicesModal}
                ></button>
              </div>
              <div className="modal-body">
                {invoiceModalLoading ? (
                  <div className="text-center py-4 text-muted">
                    Loading invoices...
                  </div>
                ) : invoiceModalInvoices.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No invoices found for this user.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Invoice No</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Created</th>
                          <th>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceModalInvoices.map((inv) => (
                          <tr key={inv._id}>
                            <td>{inv.invoiceNumber}</td>
                            <td>{inv.customerName}</td>
                            <td>₹{inv.totalAmount}</td>
                            <td>
                              {inv.createdAt
                                ? new Date(inv.createdAt).toLocaleString()
                                : "-"}
                            </td>
                            <td>
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
                  className="btn btn-secondary"
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
          ></div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-dark text-light mt-4 py-3">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="text-light text-opacity-75 small">
            © {new Date().getFullYear()} Billora Admin
          </span>
          <div className="d-flex gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="text-light"
            >
              <i className="bi bi-instagram" />
            </a>
            <a
              href="https://wa.me/910000000000"
              target="_blank"
              rel="noreferrer"
              className="text-light"
            >
              <i className="bi bi-whatsapp" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AdminDashboard;