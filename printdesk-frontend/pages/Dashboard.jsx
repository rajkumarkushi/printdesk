import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

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
        inv._id === id
          ? { ...inv, status: "Paid" }
          : inv
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
      console.log("error-", error);
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
<<<<<<< HEAD

  return (
    <div className="app-page">
      <nav className="app-nav">
        <div className="app-shell d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-2">
            <span className="brand-mark">B</span>
            <div>
              <div className="brand-title">Billora</div>
              <small className="brand-subtitle">Invoice workspace</small>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="fw-semibold d-none d-sm-inline">{profile?.businessName}</span>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </nav>

      <main className="app-shell py-4">
        <div className="dashboard-header d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <p className="metric-label mb-2">Dashboard</p>
            <h1 className="fw-bold mb-1">Welcome{profile?.businessName ? `, ${profile.businessName}` : ""}</h1>
            <p className="text-soft mb-0">Track billing activity, usage, and invoices from one place.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/create-invoice")}>Create Invoice</button>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="modern-card metric-card bg-white p-3">
              <p className="metric-label">Current Plan</p>
              <p className="metric-value">{usage?.plan ? usage.plan.toUpperCase() : "-"}</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="modern-card metric-card bg-white p-3">
              <p className="metric-label">Invoices Used</p>
              <p className="metric-value">{usage ? (usage.plan === "pro" ? usage.used : `${usage.used}/${usage.limit}`) : "-"}</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="modern-card metric-card bg-white p-3">
              <p className="metric-label">15 Day Revenue</p>
              <p className="metric-value">₹{totalRevenue}</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="modern-card metric-card bg-white p-3">
              <p className="metric-label">Total Invoices</p>
              <p className="metric-value">{invoices.length}</p>
            </div>
          </div>
        </div>

        <div className="modern-card bg-white p-3 mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h5 className="fw-bold mb-1">Plan controls</h5>
              <p className="text-soft small mb-0">Remaining: {usage?.plan === "pro" ? "Unlimited" : usage?.remaining ?? "-"}</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {usage?.plan === "free" && (
                <>
                  <button className="btn btn-outline-warning" onClick={handleUpgradeBasic}>Basic ₹199/month</button>
                  <button className="btn btn-warning" onClick={handleUpgradePro}>Pro ₹399/month</button>
                </>
              )}
              {usage?.plan === "basic" && (
                <button className="btn btn-warning" onClick={handleUpgradePro}>Upgrade to Pro ₹399/month</button>
              )}
            </div>
          </div>
        </div>

        <div className="modern-card table-card bg-white">
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">Invoices</h5>
            <span className="badge-plan">{invoices.length} total</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-soft py-5">No invoices yet.</td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td className="fw-semibold">{inv.invoiceNumber}</td>
                    <td>{inv.customerName}</td>
                    <td>
                      {inv.items.map((item, index) => (
                        <div key={index}>{item.itemType} (Qty: {item.quantity})</div>
                      ))}
                    </td>
                    <td className="fw-semibold">₹{inv.totalAmount}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-sm btn-outline-success" onClick={() => handleDownload(inv._id)}>PDF</button>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/edit-invoice/${inv._id}`)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(inv._id)}>Delete</button>
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
        <div className="app-shell small text-soft">© {new Date().getFullYear()} Billora</div>
      </footer>
    </div>
  );
}

export default Dashboard;
=======

return (
  <div className="container-fluid p-0">
    <nav
      className="navbar navbar-expand-lg shadow-sm"
      style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        padding: "12px 24px",
      }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <div
            className="d-flex align-items-center justify-content-center me-3"
            style={{
              width: "45px",
              height: "45px",
              borderRadius: "12px",
              background: "#3b82f6",
              color: "white",
              fontWeight: "700",
              fontSize: "20px",
            }}
          >
            B
          </div>

          <div>
            <h5 className="mb-0 text-white fw-bold">Billora</h5>
            <small style={{ color: "#cbd5e1", fontSize: "12px" }}>
              Smart Billing for Growing Businesses
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="text-end">
            <div className="text-white fw-semibold">
              {profile?.businessName || "Business"}
            </div>
            <small style={{ color: "#94a3b8" }}>Business Account</small>
          </div>

          <button className="btn btn-light btn-sm px-3" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>

    <div className="container-fluid mt-4 px-4">
      {usage && (
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card p-3 shadow">
              <h6>Current Plan</h6>
              <h5>{usage.plan.toUpperCase()}</h5>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card p-3 shadow">
              <h6>Invoices Used</h6>
              <h5>
                {usage.plan === "pro"
                  ? usage.used
                  : `${usage.used} / ${usage.limit}`}
              </h5>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card p-3 shadow">
              <h6>Remaining</h6>
              <h5>{usage.plan === "pro" ? "Unlimited" : usage.remaining}</h5>
            </div>
          </div>
        </div>
      )}

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card p-3 shadow">
            <h5>Total Revenue (Last 15 Days)</h5>
            <h3>₹{totalRevenue}</h3>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card p-3 shadow">
            <h5>Total Invoices</h5>
            <h3>{invoices.length}</h3>
          </div>
        </div>
      </div>

    <div className="d-flex flex-wrap gap-3 mb-4">
  <button
    className="btn px-4 py-2"
    onClick={() => navigate("/create-invoice")}
    style={{
      background: "#2563eb",
      color: "white",
      borderRadius: "12px",
      border: "none",
      fontWeight: "600",
      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
    }}
  >
    ➕ Create Invoice
  </button>

  {usage?.plan === "free" && (
    <>
      <button
        className="btn px-4 py-2"
        onClick={handleUpgradeBasic}
        style={{
          background: "#f59e0b",
          color: "white",
          borderRadius: "12px",
          border: "none",
          fontWeight: "600",
        }}
      >
        ⭐ Basic ₹199/month
      </button>

      <button
        className="btn px-4 py-2"
        onClick={handleUpgradePro}
        style={{
          background: "#7c3aed",
          color: "white",
          borderRadius: "12px",
          border: "none",
          fontWeight: "600",
        }}
      >
        🚀 Pro ₹399/month
      </button>
    </>
  )}

  {usage?.plan === "basic" && (
    <button
      className="btn px-4 py-2"
      onClick={handleUpgradePro}
      style={{
        background: "#7c3aed",
        color: "white",
        borderRadius: "12px",
        border: "none",
        fontWeight: "600",
      }}
    >
      🚀 Upgrade to Pro ₹399/month
    </button>
  )}
</div>

      <div className="table-responsive">
        <table className="table table-bordered mb-0">
          <thead className="table-light">
            <tr>
              <th>Invoice No</th>
              <th>Customer</th>
              <th>Item</th>
              <th>Price</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((inv) => (
              <tr key={inv._id}>
                <td>{inv.invoiceNumber}</td>
                <td>{inv.customerName}</td>
                <td>
                  {inv.items.map((item, index) => (
                    <div key={index}>
                      {item.itemType} (Qty: {item.quantity})
                    </div>
                  ))}
                </td>
                <td>₹{inv.totalAmount}</td>
                <td>{inv.status}</td>
                <td>
                  <button className="btn btn-sm btn-success me-2 mb-1" onClick={() => handleDownload(inv._id)}>
                    Download
                  </button>

                  <button className="btn btn-sm btn-primary me-2 mb-1" onClick={() => navigate(`/edit-invoice/${inv._id}`)}>
                    Edit
                  </button>

                  <button className="btn btn-sm btn-warning me-2 mb-1" onClick={() => markPaid(inv._id)}>
                    Mark Paid
                  </button>

                  <button className="btn btn-sm btn-outline-danger mb-1" onClick={() => handleDelete(inv._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <footer className="bg-dark text-light mt-4 py-3">
      <div className="container d-flex justify-content-between align-items-center">
        <span className="text-light text-opacity-75 small">
          © {new Date().getFullYear()} Billora
        </span>
      </div>
    </footer>
  </div>
);

}
export default Dashboard;
>>>>>>> e3b63cf940fc2a296506d50c0e7d7ad237004066
