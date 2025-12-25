import { useState, useCallback, useEffect } from 'react';
import { type Invoice } from '../types';
import { saveToGoogleSheet } from '../services/googleSheetService';

const INVOICES_STORAGE_KEY = 'invoiceai_invoices';

const getInvoicesFromStorage = (): Invoice[] => {
  try {
    const storedInvoices = localStorage.getItem(INVOICES_STORAGE_KEY);
    return storedInvoices ? JSON.parse(storedInvoices) : [];
  } catch (error) {
    console.error('Failed to load invoices from localStorage', error);
    return [];
  }
};

const saveInvoicesToStorage = (updatedInvoices: Invoice[]) => {
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(updatedInvoices));
  } catch (error) {
    console.error('Failed to save invoices to localStorage', error);
  }
};


export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setInvoices(getInvoicesFromStorage());
    setLoading(false);
  }, []);

  const addInvoice = useCallback(async (invoice: Invoice) => {
    const currentInvoices = getInvoicesFromStorage();
    const invoiceToAdd = { ...invoice };

    // Auto-increment logic is now centralized here for reliability
    if (!invoiceToAdd.invoiceNumber || invoiceToAdd.invoiceNumber.toLowerCase() === 'null') {
      const maxId = currentInvoices.reduce((max, inv) => {
        const invNum = parseInt(inv.invoiceNumber || '0', 10);
        return !isNaN(invNum) && invNum > max ? invNum : max;
      }, 0);
      invoiceToAdd.invoiceNumber = (maxId + 1).toString();
    }

    const newInvoices = [...currentInvoices, { ...invoiceToAdd, status: 'saved' as const }];
    saveInvoicesToStorage(newInvoices);
    setInvoices(newInvoices);

    // After saving locally, sync to Google Sheets
    try {
      await saveToGoogleSheet(invoiceToAdd);
    } catch (error) {
      // Log the error but rethrow so the UI can alert the user
      console.error("Failed to sync invoice to Google Sheets. The data is saved locally.", error);
      throw error;
    }

  }, []);

  const updateInvoice = useCallback((updatedInvoice: Invoice) => {
    const currentInvoices = getInvoicesFromStorage();
    const newInvoices = currentInvoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv);
    saveInvoicesToStorage(newInvoices);
    setInvoices(newInvoices);
  }, []);


  const deleteInvoice = useCallback((invoiceId: string) => {
    const currentInvoices = getInvoicesFromStorage();
    const newInvoices = currentInvoices.filter((invoice) => invoice.id !== invoiceId);
    saveInvoicesToStorage(newInvoices);
    setInvoices(newInvoices);
  }, []);

  return { invoices, addInvoice, updateInvoice, deleteInvoice, loading };
};