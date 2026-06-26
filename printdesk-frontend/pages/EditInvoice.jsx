import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";
import invoiceImg from "../src/assets/invoice.png";

function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Unpaid");


  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await API.get(`/invoices/${id}`);
        const data = res.data;

        setCustomerName(data.customerName);
        setCustomerPhone(data.customerPhone);
        setItems(data.items);
        setStatus(data.status || "Unpaid");
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
  const totalAmount = items.reduce((acc, item) => acc + Number(item.quantity) * Number(item.price), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/invoices/${id}`, {
        customerName,
        customerPhone,
        items,
        status,
      });

      alert("Invoice Updated Successfully");
      navigate("/dashboard");
    } catch (error) {
      alert("Error updating invoice");
    }
  };

  return (
    <div className="container mt-5">

      <div className="card p-4 shadow mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">Edit Invoice</h3>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="form-control mb-3"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <input
            className="form-control mb-3"
            placeholder="Customer Phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />

          <select
              className="form-control mb-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
        </select>


          <h5>Items</h5>

          <h5 className="fw-bold">Items</h5>
          {items.map((item, index) => (
            <div key={index} className="item-row row g-3 align-items-end mb-3">
              <div className="col-md-3">
                <label className="form-label">Item Type</label>
                <input name="itemType" className="form-control" placeholder="Item Type" value={item.itemType} onChange={(e) => handleItemChange(index, e)} required />
              </div>
              <div className="col-md-3">
                <label className="form-label">Design Name</label>
                <input name="designName" className="form-control" placeholder="Design Name" value={item.designName} onChange={(e) => handleItemChange(index, e)} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Qty</label>
                <input name="quantity" type="number" className="form-control" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, e)} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">Price</label>
                <input name="price" type="number" className="form-control" placeholder="Price" value={item.price} onChange={(e) => handleItemChange(index, e)} required />
              </div>
              <div className="col-md-2">
                <button type="button" className="btn btn-outline-danger w-100" onClick={() => removeItem(index)}>Remove</button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-outline-secondary mb-3" onClick={addItem}>Add Item</button>
          <div className="modern-card bg-light p-3 d-flex justify-content-between align-items-center">
            <span className="metric-label mb-0">Total</span>
            <h4 className="fw-bold mb-0">₹{totalAmount}</h4>
          </div>
          <button className="btn btn-primary mt-3 px-4">Update Invoice</button>
        </form>
      </div>

      {/* Invoice Preview Design */}
      <div className="invoice-preview">
        <img
          src={invoiceImg}
          alt="Invoice Template"
          className="invoice-template"
        />

        <h4 className="invoice-title">INVOICE</h4>

        <div className="preview-customer-name">
          {customerName}
        </div>

        <div className="preview-customer-phone">
          {customerPhone}
        </div>

        <div className="preview-items">
          {items.map((item, index) => (
            <div className="preview-row" key={index}>
              <span>{item.itemType}</span>
              <span>{item.designName}</span>
              <span>{item.quantity}</span>
              <span>₹{item.price}</span>
            </div>
          ))}
        </div>

        <div className="preview-total">
          ₹{totalAmount}
        </div>

        <div className="preview-status">
            Status: {status}
        </div>
      </div>
    </div>
  );
}

export default EditInvoice;
