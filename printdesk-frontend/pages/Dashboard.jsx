import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

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
      // If profile fetch fails, we just skip showing the name
      console.error("Failed to load business profile", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchUsage();
    fetchProfile();
  }, []);

  // Calculate total revenue for the last 15 days based on invoice.createdAt
  const now = new Date();
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(now.getDate() - 15);

  const recentInvoices = invoices.filter((invoice) => {
    if (!invoice.createdAt) return false;
    const created = new Date(invoice.createdAt);
    return !isNaN(created.getTime()) && created >= fifteenDaysAgo;
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
      // Treat 200 or 404 (already deleted) as success from UI perspective
      if (res.status === 200 || res.status === 404) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
        return;
      }
    } catch (error) {
      // Even if backend reports "not found", remove it from UI
      if (error.response?.status === 404) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
        return;
      }
      const msg = error.response?.data?.message || "Error deleting invoice";
      alert(msg);
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
    console.log("error-",error)
    console.log("Downloading ID:", id);
  }
};

// const handleUpgrade = async () => {
//   const { data } = await API.post("/payments/create-order");

//   const options = {
//     key: import.meta.env.VITE_RAZORPAY_KEY,
//     amount: data.amount,
//     currency: data.currency,
//     order_id: data.id,
//     handler: async function (response) {
//       await API.post("/payments/verify-payment", response);
//       alert("Plan upgraded successfully!");
//       window.location.reload();
//     },
//   };

//   const rzp = new window.Razorpay(options);
//   rzp.open();
// };
  const handleUpgradeBasic = async () => {
    try {
      const res = await API.post("/payments/mock-upgrade-basic");
      alert(res.data.message);
      window.location.reload();
    } catch (error) {
      const msg = error.response?.data?.message || "Upgrade to Basic failed";
      alert(msg);
    }
  };

  const handleUpgradePro = async () => {
    try {
      const res = await API.post("/payments/mock-upgrade-pro");
      alert(res.data.message);
      window.location.reload();
    } catch (error) {
      const msg = error.response?.data?.message || "Upgrade to Pro failed";
      alert(msg);
    }
  };
  return (
    <div className="container-fluid">
      <nav className="navbar navbar-dark bg-dark">
        <div className="container-fluid px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center"
              style={{ width: 32, height: 32, fontWeight: 700 }}
            >
              B
            </div>
            <div>
              <span className="navbar-brand d-block mb-0">Billora</span>
              <small className="text-light text-opacity-75">
                Smart Billing for Growing Businesses
              </small>
            </div>
          </div>
          <div className="d-flex flex-column align-items-end">
            <span className="text-light fw-semibold">
              {profile?.businessName}
            </span>
            <button
              className="btn btn-outline-light btn-sm mt-1"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

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
      <div className="container-fluid mt-4">
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

        <div className="d-flex flex-wrap justify-content-between mb-3 gap-2">
          <button
            className="btn btn-primary mb-2"
            onClick={() => navigate("/create-invoice")}
          >
            Create Invoice
          </button>
          <div className="d-flex flex-wrap gap-2">
            {usage?.plan === "free" && (
              <>
                <button
                  className="btn btn-outline-warning mb-2"
                  onClick={handleUpgradeBasic}
                >
                  Upgrade to Basic – ₹199/month (200 invoices)
                </button>
                <button
                  className="btn btn-warning mb-2"
                  onClick={handleUpgradePro}
                >
                  Go Pro – ₹399/month (Unlimited)
                </button>
              </>
            )}
            {usage?.plan === "basic" && (
              <button
                className="btn btn-warning mb-2"
                onClick={handleUpgradePro}
              >
                Upgrade to Pro – ₹399/month (Unlimited)
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered mb-0">
            <thead className="table-light">
              <tr>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Price</th>
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
                  <td>
                    <button
                      className="btn btn-sm btn-success me-2 mb-1"
                      onClick={() => handleDownload(inv._id)}
                    >
                      Download
                    </button>
                    <button
                      className="btn btn-sm btn-primary me-2 mb-1"
                      onClick={() => navigate(`/edit-invoice/${inv._id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger mb-1"
                      onClick={() => handleDelete(inv._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
    </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-light mt-4 py-3">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="text-light text-opacity-75 small">
            © {new Date().getFullYear()} Billora
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

export default Dashboard;