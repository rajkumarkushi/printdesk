import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function CreateInvoice() {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([{ itemType: "", designName: "", quantity: 1, price: 0 }]);

  const handleItemChange = (index, e) => {
    const newItems = [...items];
    newItems[index][e.target.name] = e.target.value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { itemType: "", designName: "", quantity: 1, price: 0 }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
  const totalAmount = items.reduce((acc, item) => acc + item.quantity * item.price, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/invoices", { customerName, customerPhone, items });
      alert("Invoice Created");
      navigate("/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Error creating invoice");
    }
  };

  return (
    <div className="invoice-page">
      <div className="invoice-form-card modern-card bg-white p-4 p-md-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <p className="metric-label mb-1">New invoice</p>
            <h3 className="fw-bold mb-0">Create Invoice</h3>
          </div>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Close</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label">Customer Name</label>
              <input className="form-control" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Customer Phone</label>
              <input className="form-control" placeholder="Customer Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

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
          <button className="btn btn-primary mt-3 px-4">Create Invoice</button>
        </form>
      </div>
    </div>
  );
}

export default CreateInvoice;
