import React, { useState } from 'react';
import { useInvoices } from '../hooks/useInvoices';
import { type Invoice } from '../types';

const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        // Format to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return dateString;
    }
};

const InvoicesList: React.FC = () => {
    const { invoices, updateInvoice, deleteInvoice, loading } = useInvoices();
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

    const handleSave = (updatedInvoice: Invoice) => {
        updateInvoice(updatedInvoice);
        setEditingInvoice(null);
    };

    const handleDeleteConfirm = () => {
        if (deletingInvoiceId) {
            deleteInvoice(deletingInvoiceId);
            setDeletingInvoiceId(null);
        }
    };

    const exportToCSV = () => {
        if (invoices.length === 0) {
            alert("No invoices to export.");
            return;
        }

        const formatCSVField = (field: any): string => {
            const str = String(field === null || field === undefined ? 'N/A' : field);
            // Wrap in quotes if it contains a comma, double quote, or newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = ['Vendor Name', 'Invoice Number', 'Invoice Date', 'Invoice Time', 'Total Amount'];
        const csvRows = [
            headers.join(','),
            ...invoices.map(inv => [
                formatCSVField(inv.vendorName),
                formatCSVField(inv.invoiceNumber),
                formatCSVField(formatDateForDisplay(inv.invoiceDate)),
                formatCSVField(inv.invoiceTime),
                (inv.totalAmount || 0).toFixed(2)
            ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "invoices.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    if (loading) {
        return <div>Loading invoices...</div>;
    }

    if (invoices.length === 0) {
        return (
            <div className="text-center py-10">
                <h2 className="text-3xl font-bold mb-2">Invoice History</h2>
                <p className="text-gray-500">You haven't saved any invoices yet.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Invoice History</h2>
                    <p className="text-gray-600 dark:text-gray-400">View, edit, and manage your saved invoices.</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="w-full sm:w-auto px-5 py-2.5 bg-accent-blue text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-md shadow-accent-glow"
                >
                    Export to CSV
                </button>
            </div>


            <div className="bg-white/5 dark:bg-dark-card/50 backdrop-blur-lg rounded-xl border border-gray-200/20 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-card/60">
                            <tr>
                                <th scope="col" className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                                <th scope="col" className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                                <th scope="col" className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th scope="col" className="p-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                <th scope="col" className="p-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                                <th scope="col" className="p-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="border-b border-gray-200/50 dark:border-dark-border/50">
                                    <td className="p-4 font-medium text-gray-900 dark:text-white">{invoice.vendorName || 'N/A'}</td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400">{invoice.invoiceNumber || 'N/A'}</td>
                                    <td className="p-4 text-gray-700 dark:text-gray-300">{formatDateForDisplay(invoice.invoiceDate)}</td>
                                    <td className="p-4 text-gray-700 dark:text-gray-300">{invoice.invoiceTime || 'N/A'}</td>
                                    <td className="p-4 text-right font-semibold text-gray-900 dark:text-white">₹{(invoice.totalAmount || 0).toFixed(2)}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => setEditingInvoice(invoice)} className="text-blue-500 hover:underline text-sm">Edit</button>
                                            <button onClick={() => setDeletingInvoiceId(invoice.id)} className="text-red-500 hover:underline text-sm">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingInvoice && (
                <EditModal
                    invoice={editingInvoice}
                    onSave={handleSave}
                    onClose={() => setEditingInvoice(null)}
                />
            )}

            {deletingInvoiceId && (
                <DeleteConfirmationModal
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletingInvoiceId(null)}
                />
            )}
        </div>
    );
};

// A simple modal for editing. Could be more complex.
const EditModal: React.FC<{ invoice: Invoice, onSave: (invoice: Invoice) => void, onClose: () => void }> = ({ invoice, onSave, onClose }) => {
    const [editedInvoice, setEditedInvoice] = useState<Invoice>(invoice);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedInvoice(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-gray-100 dark:bg-dark-bg rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Edit Invoice</h3>

                {/* Simplified form for brevity. A real app might reuse InvoiceTable component */}
                <div className="space-y-4">
                    <InputField label="Vendor Name" name="vendorName" value={editedInvoice.vendorName || ''} onChange={handleChange} />
                    <InputField label="Invoice Number" name="invoiceNumber" value={editedInvoice.invoiceNumber || ''} onChange={handleChange} />
                    <InputField label="Invoice Date" name="invoiceDate" type="date" value={editedInvoice.invoiceDate || ''} onChange={handleChange} />
                    {/* Line Items editing can be added here */}
                    <InputField label="Total Amount" name="totalAmount" type="number" value={editedInvoice.totalAmount || 0} onChange={handleChange} />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300 dark:bg-dark-border">Cancel</button>
                    <button onClick={() => onSave(editedInvoice)} className="px-4 py-2 rounded bg-accent-blue text-white">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const InputField: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; }> = ({ label, name, value, onChange, type = 'text' }) => (
    <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <input type={type} name={name} value={value} onChange={onChange} className="w-full bg-transparent border-2 border-gray-300 dark:border-dark-border rounded-lg p-2 focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors" />
    </div>
);


const DeleteConfirmationModal: React.FC<{ onConfirm: () => void, onCancel: () => void }> = ({ onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-gray-100 dark:bg-dark-bg rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold">Confirm Deletion</h3>
                <p className="my-4 text-gray-600 dark:text-gray-400">Are you sure you want to delete this invoice? This action cannot be undone.</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-300 dark:bg-dark-border">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white">Delete</button>
                </div>
            </div>
        </div>
    );
};

export default InvoicesList;
