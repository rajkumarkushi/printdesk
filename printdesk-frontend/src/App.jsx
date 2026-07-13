import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import CreateInvoice from "../pages/CreateInvoice";
import ProtectedRoute from "../components/ProtectedRoute";
import Landing from "../pages/Landing";
import EditInvoice from "../pages/EditInvoice";
import AdminDashboard from "../pages/AdminDashboard";
import UploadLogo from "../pages/UploadLogo";
import PaymentHistory from "../pages/PaymentHistory";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/upload-logo/:id" element={<UploadLogo />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        <Route
          path="/payment-history"
          element={
            <ProtectedRoute>
              <PaymentHistory />
            </ProtectedRoute>
          }
        />

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