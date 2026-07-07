import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import billoraLogo from "../src/assets/billora.png";

function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  const markPaid = async (id) => {
    try {
      await API.put(`/invoices/${id}/paid`);
      setInvoices(
        invoices.map((inv) =>
          inv._id === id ? { ...inv, status: "Paid" } : inv
        )
      );
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const fetchInvoices = async () => {
    const res = await API.get("/invoices");
    setInvoices(res.data);
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
    fetchInvoices();
    fetchUsage();
    fetchProfile();
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
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await API.delete(`/invoices/${id}`);
      if (res.status === 200 || res.status === 404) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
        return;
      }
      alert(error.response?.data?.message || "Error deleting invoice");
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
      alert("Download failed");
    }
  };

  const handleUpgradeBasic = async () => {
    try {
      const res = await API.post("/payments/mock-upgrade-basic");
      alert(res.data.message);
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || "Upgrade to Basic failed");
    }
  };

  const handleUpgradePro = async () => {
    try {
      const res = await API.post("/payments/mock-upgrade-pro");
      alert(res.data.message);
      window.location.reload();
    } catch (error) {
      alert(error.response?.data?.message || "Upgrade to Pro failed");
    }
  };

  return (
    <div className="app-page">
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
              <div className="brand-title fs-5">Billora</div>
              <small className="text-soft" style={{ fontSize: "0.75rem" }}>Invoice workspace</small>
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
              {profile?.businessName || "Business"}
            </div>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="app-shell py-4">
        <div className="dashboard-header d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <p className="metric-label mb-2">Dashboard</p>
            <h1 className="fw-bold mb-1">
              Welcome{profile?.businessName ? `, ${profile.businessName}` : ""}
            </h1>
            <p className="text-soft mb-0">Track billing activity, usage, and invoices from one place.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/create-invoice")}
            style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 10, paddingBottom: 10 }}
          >
            + Create Invoice
          </button>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="stat-card brand-accent p-4">
              <p className="metric-label mb-2">Current Plan</p>
              <p className="metric-value">{usage?.plan ? usage.plan.toUpperCase() : "-"}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card success-accent p-4">
              <p className="metric-label mb-2">Invoices Used</p>
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
              <p className="metric-label mb-2">15 Day Revenue</p>
              <p className="metric-value">&#8377;{totalRevenue.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="stat-card info-accent p-4">
              <p className="metric-label mb-2">Total Invoices</p>
              <p className="metric-value">{invoices.length}</p>
            </div>
          </div>
        </div>

        <div className="summary-card p-4 mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h5 className="fw-bold mb-1">Plan controls</h5>
              <p className="text-soft small mb-0">
                Remaining:{" "}
                {usage?.plan === "pro" ? "Unlimited" : usage?.remaining ?? "-"}
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {usage?.plan === "free" && (
                <>
                  <button className="btn btn-outline-warning btn-sm" onClick={handleUpgradeBasic}>
                    Basic &#8377;199/month
                  </button>
                  <button className="btn btn-warning btn-sm" onClick={handleUpgradePro}>
                    Pro &#8377;399/month
                  </button>
                </>
              )}
              {usage?.plan === "basic" && (
                <button className="btn btn-warning btn-sm" onClick={handleUpgradePro}>
                  Upgrade to Pro &#8377;399/month
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modern-card table-card bg-white">
          <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">Invoices</h5>
            <span className="badge-plan">{invoices.length} total</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-soft py-5">
                      <div className="empty-state">
                        <div className="empty-state-icon">&#128196;</div>
                        <p className="mb-0">No invoices yet. Create your first invoice to get started.</p>
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
                        {inv.status || "Unpaid"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2 justify-content-end">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleDownload(inv._id)}
                          title="Download PDF"
                        >
                          &#128196; PDF
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/edit-invoice/${inv._id}`)}
                          title="Edit Invoice"
                        >
                          &#9998; Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(inv._id)}
                          title="Delete Invoice"
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
        </div>
      </main>

      <footer className="py-4">
        <div className="app-shell small text-soft">&copy; {new Date().getFullYear()} Billora</div>
      </footer>
    </div>
  );
}

export default Dashboard;
