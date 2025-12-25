import React, { useState, useEffect } from 'react';
import { type Invoice } from '../types';
import { useInvoices } from '../hooks/useInvoices';
import { saveToGoogleSheet } from '../services/googleSheetService';

interface InvoiceTableProps {
  invoice: Invoice;
  onComplete: () => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoice, onComplete }) => {
  const [editedInvoice, setEditedInvoice] = useState<Invoice>(invoice);
  const { addInvoice } = useInvoices();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Recalculate total when line items change
    const lineItemsTotal = editedInvoice.lineItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const newTotal = lineItemsTotal;

    // Only update if it's different to avoid re-renders. A small threshold for float comparison.
    if (Math.abs(newTotal - (editedInvoice.totalAmount || 0)) > 0.001) {
      setEditedInvoice(prev => ({ ...prev, totalAmount: newTotal }));
    }
  }, [editedInvoice.lineItems, editedInvoice.totalAmount]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setEditedInvoice(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || null : value,
    }));
  };

  const handleLineItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const updatedLineItems = [...editedInvoice.lineItems];
    const itemToUpdate = { ...updatedLineItems[index] };

    const numericValue = type === 'number' ? parseFloat(value) || 0 : 0;

    if (name === 'description') {
      itemToUpdate.description = value;
    } else if (name === 'quantity') {
      itemToUpdate.quantity = numericValue;
    } else if (name === 'unitPrice') {
      itemToUpdate.unitPrice = numericValue;
    }

    // Recalculate subtotal for the line item
    itemToUpdate.subtotal = itemToUpdate.quantity * itemToUpdate.unitPrice;

    updatedLineItems[index] = itemToUpdate;
    setEditedInvoice(prev => ({ ...prev, lineItems: updatedLineItems }));
  };

  const addLineItem = () => {
    setEditedInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0, subtotal: 0 }],
    }));
  };

  const removeLineItem = (index: number) => {
    setEditedInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // addInvoice handles both local save and syncing to Google Sheets
      await addInvoice(editedInvoice);
      onComplete();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      alert(`Failed to save to Google Sheet: ${(error as Error).message}. Local save likely succeeded.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white/10 dark:bg-dark-card/50 backdrop-blur-lg rounded-xl border border-white/20 dark:border-dark-border p-4 sm:p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">
        Reviewing: <span className="text-accent-blue">{invoice.fileName || 'Text Input'}</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Vendor Name" name="vendorName" value={editedInvoice.vendorName || ''} onChange={handleInputChange} />
        <InputField label="Invoice Number" name="invoiceNumber" value={editedInvoice.invoiceNumber || ''} onChange={handleInputChange} />
        <InputField label="Invoice Date" name="invoiceDate" type="date" value={editedInvoice.invoiceDate || ''} onChange={handleInputChange} />
        <InputField label="Invoice Time" name="invoiceTime" type="time" value={editedInvoice.invoiceTime || ''} onChange={handleInputChange} />
      </div>

      <h4 className="font-semibold mt-6 mb-2">Line Items</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-gray-300 dark:border-dark-border">
            <tr>
              <th className="p-2 text-sm">Description</th>
              <th className="p-2 text-sm text-right">Qty</th>
              <th className="p-2 text-sm text-right">Unit Price</th>
              <th className="p-2 text-sm text-right">Subtotal</th>
              <th className="p-2 text-sm"></th>
            </tr>
          </thead>
          <tbody>
            {editedInvoice.lineItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-200/50 dark:border-dark-border/50">
                <td><input type="text" name="description" value={item.description} onChange={(e) => handleLineItemChange(index, e)} className="w-full bg-transparent p-2 rounded focus:bg-white/10 dark:focus:bg-black/20 outline-none" /></td>
                <td><input type="number" name="quantity" value={item.quantity} onChange={(e) => handleLineItemChange(index, e)} className="w-20 bg-transparent p-2 text-right rounded focus:bg-white/10 dark:focus:bg-black/20 outline-none" /></td>
                <td><input type="number" name="unitPrice" value={item.unitPrice} onChange={(e) => handleLineItemChange(index, e)} className="w-24 bg-transparent p-2 text-right rounded focus:bg-white/10 dark:focus:bg-black/20 outline-none" /></td>
                <td className="p-2 text-right">₹{item.subtotal.toFixed(2)}</td>
                <td><button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 p-2 text-xs">DEL</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addLineItem} className="mt-2 text-accent-blue text-sm font-semibold hover:underline">+ Add Line</button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div></div>
        <div className="space-y-2 text-right">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total</span>
            <span>₹{(editedInvoice.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={handleSave} disabled={isSaving} className="bg-accent-blue text-white font-bold py-2 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center">
          {isSaving ? 'Saving...' : 'Confirm & Save Invoice'}
        </button>
      </div>
    </div>
  );
};

// Reusable InputField component
const InputField: React.FC<{
  label?: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
}> = ({ label, name, value, onChange, type = 'text', className = '' }) => (
  <div>
    {label && <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">{label}</label>}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full bg-transparent border-2 border-gray-300 dark:border-dark-border rounded-lg p-2 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors ${className}`}
    />
  </div>
);

export default InvoiceTable;
