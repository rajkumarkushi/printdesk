import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

function CreateInvoice() {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [items, setItems] = useState([
    { itemType: "", designName: "", quantity: 1, price: 0 },
  ]);

  const handleItemChange = (index, e) => {
    const newItems = [...items];
    newItems[index][e.target.name] = e.target.value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      { itemType: "", designName: "", quantity: 1, price: 0 },
    ]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const totalAmount = items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/invoices", {
        customerName,
        customerPhone,
        items,
      });

      alert("Invoice Created");
      navigate("/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Error creating invoice");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">Create Invoice</h3>
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

          <h5>Items</h5>

          {items.map((item, index) => (
            <div key={index} className="row mb-3">
              <div className="col-md-3">
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
                <input
                  name="designName"
                  className="form-control"
                  placeholder="Design Name"
                  value={item.designName}
                  onChange={(e) => handleItemChange(index, e)}
                />
              </div>

              <div className="col-md-2">
                <input
                  name="quantity"
                  type="number"
                  className="form-control"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, e)}
                  required
                />
              </div>

              <div className="col-md-2">
                <input
                  name="price"
                  type="number"
                  className="form-control"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, e)}
                  required
                />
              </div>

              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeItem(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="btn btn-secondary mb-3"
            onClick={addItem}
          >
            + Add Item
          </button>

          <h5>Total: ₹{totalAmount}</h5>

          <button className="btn btn-primary mt-3">
            Create Invoice
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateInvoice;