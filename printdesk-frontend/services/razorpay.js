import API from "../services/api";
import { loadRazorpayScript } from "../utils/loadRazorpay";

export async function openRazorpayCheckout({ plan, profile, t }) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    alert(t("dashboard.errPaymentLoading"));
    return;
  }

  const { data: orderData } = await API.post("/payments/create-order", { plan });

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "Billora",
    description: `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
    order_id: orderData.orderId,
    handler: async (response) => {
      try {
        const { data } = await API.post("/payments/verify-payment", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          plan,
        });
        alert(data.message);
        window.location.reload();
      } catch (error) {
        alert(error.response?.data?.message || t("dashboard.errPaymentVerify"));
      }
    },
    prefill: {
      name: profile?.businessName || "Billora User",
      email: profile?.email || "",
      contact: profile?.phone || "",
      country: "IN",
    },
    theme: { color: "#4f46e5" },
    modal: { ondismiss: () => {} },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

export async function openRazorpayInvoiceCheckout({ invoiceId, profile, t, onSuccess }) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    alert(t("dashboard.errPaymentLoading"));
    return;
  }

  const { data: orderData } = await API.post("/payments/create-invoice-order", { invoiceId });

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "Billora",
    description: `Pay Invoice ${orderData.invoiceNumber}`,
    order_id: orderData.orderId,
    handler: async (response) => {
      try {
        const { data } = await API.post("/payments/verify-invoice-payment", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          invoiceId,
        });
        alert(data.message);
        onSuccess?.();
      } catch (error) {
        alert(error.response?.data?.message || t("dashboard.errPaymentVerify"));
      }
    },
    prefill: {
      name: profile?.businessName || "Billora User",
      email: profile?.email || "",
      contact: profile?.phone || "",
      country: "IN",
    },
    theme: { color: "#4f46e5" },
    modal: { ondismiss: () => {} },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}
