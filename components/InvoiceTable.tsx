import React, { useState, useEffect } from 'react';
import { type Invoice, type LineItem } from '../types';
import { useInvoices } from '../hooks/useInvoices';

interface InvoiceTableProps {
  invoice: Invoice;
  onComplete: () => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoice, onComplete }) => {
  const [editedInvoice, setEditedInvoice] = useState<Invoice>(invoice);
  const [isSaving, setIsSaving] = useState(false);
  const { addInvoice } = useInvoices();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedInvoice(prev => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedLineItems = [...editedInvoice.lineItems];
    const lineItem = { ...updatedLineItems[index] };
  
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
    if (field === 'description') {
      (lineItem[field] as string) = value as string;
    } else if (!isNaN(numericValue)) {
      (lineItem[field] as number) = numericValue;
    }
    
    if ((field === 'quantity' || field === 'unitPrice') && !isNaN(lineItem.quantity) && !isNaN(lineItem.unitPrice)) {
        lineItem.subtotal = lineItem.quantity * lineItem.unitPrice;
    }
    
    updatedLineItems[index] = lineItem;
    setEditedInvoice(prev => ({ ...prev, lineItems: updatedLineItems }));
  };

  const addLineItem = () => {
    setEditedInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPrice: 0, subtotal: 0 }]
    }));
  };

  const removeLineItem = (index: number) => {
    setEditedInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await addInvoice(editedInvoice);
      onComplete();
    } catch (error) {
      console.error("Failed to save invoice:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  useEffect(() => {
    // FIX: A safeguard to prevent overwriting the total amount on simple receipts.
    // The total is only recalculated from line items if line items actually exist.
    // This prevents the total from being reset to 0 for receipts that only have a total.
    if (editedInvoice.lineItems && editedInvoice.lineItems.length > 0) {
        const itemsTotal = editedInvoice.lineItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const tax = Number(editedInvoice.taxAmount) || 0;
        
        const calculatedTotal = itemsTotal + tax;
        if (editedInvoice.totalAmount !== calculatedTotal) {
           setEditedInvoice(prev => ({
                ...prev,
                totalAmount: calculatedTotal
           }));
        }
    }
  }, [editedInvoice.lineItems, editedInvoice.taxAmount, editedInvoice.totalAmount]);


  return (
    <div className="bg-white/10 dark:bg-dark-card/50 backdrop-blur-lg rounded-xl border border-white/20 dark:border-dark-border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">
          Reviewing: <span className="text-accent-blue">{invoice.fileName || 'Text Input'}</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InputField label="Vendor Name" name="vendorName" value={editedInvoice.vendorName || ''} onChange={handleInputChange} />
        <InputField label="Invoice #" name="invoiceNumber" value={editedInvoice.invoiceNumber || ''} onChange={handleInputChange} />
        <InputField label="Invoice Date" name="invoiceDate" type="date" value={editedInvoice.invoiceDate || ''} onChange={handleInputChange} />
        <InputField label="Invoice Time" name="invoiceTime" type="time" value={editedInvoice.invoiceTime || ''} onChange={handleInputChange} />
      </div>

      <div>
        <h4 className="font-semibold mb-2">Line Items</h4>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="border-b border-gray-300/50 dark:border-dark-border">
                    <tr>
                        <th className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                        <th className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Qty</th>
                        <th className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Unit Price</th>
                        <th className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Subtotal</th>
                        <th className="p-2 w-12"></th>
                    </tr>
                </thead>
                <tbody>
                    {editedInvoice.lineItems.map((item, index) => (
                        <tr key={index}>
                            <td className="p-1"><input type="text" value={item.description} onChange={(e) => handleLineItemChange(index, 'description', e.target.value)} className="w-full bg-transparent border border-gray-300/50 dark:border-dark-border/50 rounded-md p-2 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue" /></td>
                            <td className="p-1"><input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)} className="w-full bg-transparent border border-gray-300/50 dark:border-dark-border/50 rounded-md p-2 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue" /></td>
                            <td className="p-1"><input type="number" value={item.unitPrice} onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)} className="w-full bg-transparent border border-gray-300/50 dark:border-dark-border/50 rounded-md p-2 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue" /></td>
                            <td className="p-1"><input type="number" value={item.subtotal} readOnly className="w-full bg-gray-200/20 dark:bg-dark-border/20 border border-gray-300/50 dark:border-dark-border/50 rounded-md p-2 text-gray-500 dark:text-gray-400" /></td>
                            <td className="p-1 text-center"><button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 p-1 text-2xl font-bold">&times;</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <button onClick={addLineItem} className="mt-2 text-sm text-accent-blue hover:underline">+ Add Line Item</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4 border-t border-gray-300/50 dark:border-dark-border">
          <div className="md:col-span-2">
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{editedInvoice.lineItems.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
                <span>Tax</span>
                <div className="flex items-center gap-1">
                    <span>₹</span>
                    <input type="number" name="taxAmount" value={editedInvoice.taxAmount || 0} onChange={handleInputChange} className="w-24 bg-transparent border border-gray-300/50 dark:border-dark-border/50 rounded-md p-1.5 text-right focus:ring-1 focus:ring-accent-blue focus:border-accent-blue" />
                </div>
            </div>
             <div className="flex justify-between font-bold text-lg border-t border-gray-300/50 dark:border-dark-border pt-2">
                <span>Total</span>
                <span>₹{(editedInvoice.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
      </div>

      <div className="flex justify-end gap-4">
        <button onClick={onComplete} className="px-4 py-2 rounded bg-gray-300/50 dark:bg-dark-border/50 hover:bg-gray-400/50 dark:hover:bg-dark-border">Discard</button>
        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 rounded bg-accent-blue text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center">
            {isSaving && (
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {isSaving ? 'Saving...' : 'Save Invoice'}
        </button>
      </div>
    </div>
  );
};

const InputField: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; }> = ({ label, name, value, onChange, type = 'text' }) => (
    <div>
        <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">{label}</label>
        <input type={type} name={name} value={value} onChange={onChange} className="w-full bg-transparent border-2 border-gray-300/50 dark:border-dark-border rounded-lg p-2 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors" />
    </div>
);

export default InvoiceTable;