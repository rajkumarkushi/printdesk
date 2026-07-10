import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";
import ThemeToggle from "../src/components/ThemeToggle";

function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Unpaid");
  const [gstPercent, setGstPercent] = useState(18);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await API.get(`/invoices/${id}`);
        const data = res.data;

        setCustomerName(data.customerName);
        setCustomerPhone(data.customerPhone);
        setItems(data.items);
        setStatus(data.status || "Unpaid");
        setGstPercent(data.gstPercent || 18);
        setDiscount(data.discount || 0);
      } catch (error) {
        alert("Error loading invoice");
      }
    };
    fetchInvoice();
  }, [id]);

  const handleItemChange = (index, e) => {
    const newItems = [...items];
    newItems[index][e.target.name] = e.target.value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { itemType: "", designName: "", quantity: 1, price: 0 }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.quantity) * Number(item.price),
    0
  );

  const gstAmount = Math.round((subtotal * Number(gstPercent)) / 100);

  const totalAmount = Math.max(
    0,
    subtotal + gstAmount - Number(discount || 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/invoices/${id}`, {
        customerName,
        customerPhone,
        items,
        status,
        gstPercent,
        discount,
      });
      alert("Invoice Updated Successfully");
      navigate("/dashboard");
    } catch (error) {
      alert("Error updating invoice");
    }
  };

  return (
    <div className="invoice-page">
      <div className="invoice-form-card bg-white p-4 p-md-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <p className="metric-label mb-1">Edit invoice</p>
            <h3 className="fw-bold mb-0">Edit Invoice</h3>
          </div>
          <div className="d-flex gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate(-1)}
            >
              &times; Close
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label">Customer Name</label>
              <input
                className="form-control"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Customer Phone</label>
              <input
                className="form-control"
                placeholder="Customer Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">Items</h5>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={addItem}
            >
              + Add Item
            </button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="item-row row g-3 align-items-end mb-3">
              <div className="col-md-3">
                <label className="form-label">Item Type</label>
                <input
                  name="itemType"
                  className="form-control"
                  placeholder="Item Type"
                  value={item.itemType}
                  onChange={(e) => handleItemChange(index, e)}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Design Name</label>
                <input
                  name="designName"
                  className="form-control"
                  placeholder="Design Name"
                  value={item.designName}
                  onChange={(e) => handleItemChange(index, e)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Qty</label>
                <input
                  name="quantity"
                  type="number"
                  className="form-control"
                  placeholder="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, e)}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Price</label>
                <input
                  name="price"
                  type="number"
                  className="form-control"
                  placeholder="0"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, e)}
                  required
                />
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-outline-danger w-100"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="summary-card p-4 mt-4">
            <h6 className="fw-bold mb-3">Summary</h6>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">GST Rate</label>
                <select
                  className="form-select"
                  value={gstPercent}
                  onChange={(e) => setGstPercent(Number(e.target.value))}
                >
                  <option value={0}>GST 0%</option>
                  <option value={5}>GST 5%</option>
                  <option value={12}>GST 12%</option>
                  <option value={18}>GST 18%</option>
                  <option value={28}>GST 28%</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Discount</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <div
              className="p-3 mt-2"
              style={{
                borderRadius: "var(--radius)",
                background: "linear-gradient(135deg, rgba(79, 70, 229, 0.04), rgba(6, 182, 212, 0.04))",
                border: "1px solid var(--line)",
              }}
            >
              <div className="d-flex justify-content-between mb-2">
                <span className="text-soft">Subtotal</span>
                <span className="fw-semibold">&#8377;{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-soft">GST ({gstPercent}%)</span>
                <span className="fw-semibold">&#8377;{gstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-soft">Discount</span>
                <span className="fw-semibold">&#8377;{Number(discount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div
                className="d-flex justify-content-between pt-3"
                style={{ borderTop: "2px solid var(--line)" }}
              >
                <span className="metric-label mb-0">Total</span>
                <h4 className="fw-bold mb-0" style={{ color: "var(--brand)" }}>
                  &#8377;{totalAmount.toLocaleString("en-IN")}
                </h4>
              </div>
            </div>
          </div>

          <button className="btn btn-primary mt-4 px-5 py-2">
            Update Invoice
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditInvoice;
