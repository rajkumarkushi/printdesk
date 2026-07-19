import { useState, useCallback } from "react";

const useInvoiceForm = (initialItems = [{ itemType: "", designName: "", quantity: 1, price: 0 }]) => {
  const [items, setItems] = useState(initialItems);
  const [gstPercent, setGstPercent] = useState(18);
  const [discount, setDiscount] = useState(0);

  const handleItemChange = useCallback((index, e) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [e.target.name]: e.target.value };
      return newItems;
    });
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { itemType: "", designName: "", quantity: 1, price: 0 }]);
  }, []);

  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const subtotal = items.reduce((acc, item) => acc + Number(item.quantity) * Number(item.price), 0);
  const gstAmount = Math.round((subtotal * Number(gstPercent)) / 100);
  const discountAmount = Math.round((subtotal * Number(discount || 0)) / 100);
  const totalAmount = Math.max(0, subtotal + gstAmount - discountAmount);

  const validate = (t) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemType?.trim()) return t("createInvoice.errItemType", { num: i + 1 });
      if (!item.designName?.trim()) return t("createInvoice.errDesign", { num: i + 1 });
      if (!item.quantity || Number(item.quantity) <= 0) return t("createInvoice.errQty", { num: i + 1 });
      if (!item.price || Number(item.price) <= 0) return t("createInvoice.errPrice", { num: i + 1 });
    }
    return null;
  };

  return {
    items, setItems,
    gstPercent, setGstPercent,
    discount, setDiscount,
    handleItemChange, addItem, removeItem,
    subtotal, gstAmount, discountAmount, totalAmount,
    validate,
  };
};

export default useInvoiceForm;
