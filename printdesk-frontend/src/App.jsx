import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import CreateInvoice from "../pages/CreateInvoice";
import ProtectedRoute from "../components/ProtectedRoute";
import Landing from "../pages/Landing";
import EditInvoice from "../pages/EditInvoice";
import AdminDashboard from "../pages/AdminDashboard";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
  path="/create-invoice"
  element={
    <ProtectedRoute>
      <CreateInvoice />
    </ProtectedRoute>
  }
/>
<Route path="/edit-invoice/:id" element={<EditInvoice />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;