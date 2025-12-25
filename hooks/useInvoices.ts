import { useState, useCallback, useEffect } from 'react';
import { type Invoice } from '../types';
import { saveToGoogleSheet, fetchInvoices } from '../services/googleSheetService';

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

  const refreshInvoices = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch from Google Sheet (Source of Truth)
      const syncedInvoices = await fetchInvoices();

      if (syncedInvoices && syncedInvoices.length > 0) {
        const finalInvoices = syncedInvoices.map(inv => ({ ...inv, status: 'saved' as const }));
        saveInvoicesToStorage(finalInvoices);
        setInvoices(finalInvoices);
      } else {
        // If empty/fail, do nothing or handle accordingly
      }
    } catch (error) {
      console.error("Failed to refresh invoices:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load (Refresh from server)
  useEffect(() => {
    // Load from local storage first for instant render
    setInvoices(getInvoicesFromStorage());

    // Then sync with server
    refreshInvoices();
  }, [refreshInvoices]);


  const addInvoice = useCallback(async (invoice: Invoice) => {
    const currentInvoices = getInvoicesFromStorage();
    const invoiceToAdd = { ...invoice };

    // Auto-increment logic
    if (!invoiceToAdd.invoiceNumber || invoiceToAdd.invoiceNumber.toLowerCase() === 'null') {
      const maxId = currentInvoices.reduce((max, inv) => {
        const invNum = parseInt(inv.invoiceNumber || '0', 10);
        return !isNaN(invNum) && invNum > max ? invNum : max;
      }, 0);
      invoiceToAdd.invoiceNumber = (maxId + 1).toString();
    }

    try {
      // 1. Sync to Google Sheets immediately
      const syncedInvoices = await saveToGoogleSheet(invoiceToAdd);

      if (syncedInvoices && syncedInvoices.length > 0) {
        // 2. Success: Update local storage/state with the FRESH LIST from server
        // Ensure they are marked as 'saved'
        const finalInvoices = syncedInvoices.map(inv => ({ ...inv, status: 'saved' as const }));
        saveInvoicesToStorage(finalInvoices);
        setInvoices(finalInvoices);
      } else {
        // 3. Fallback (empty response): Add locally
        const newInvoices = [...currentInvoices, { ...invoiceToAdd, status: 'saved' as const }];
        saveInvoicesToStorage(newInvoices);
        setInvoices(newInvoices);
      }

    } catch (error) {
      console.error("Failed to sync invoice to Google Sheets. The data is saved locally.", error);
      // 4. Error Fallback: Add locally and alert user
      const newInvoices = [...currentInvoices, { ...invoiceToAdd, status: 'saved' as const }];
      saveInvoicesToStorage(newInvoices);
      setInvoices(newInvoices);
      throw error;
    }

  }, []);

  const updateInvoice = useCallback(async (updatedInvoice: Invoice) => {
    // Optimistic update locally
    const currentInvoices = getInvoicesFromStorage();
    const newInvoicesLocal = currentInvoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv);

    // Update state immediately to reflect changes
    setInvoices(newInvoicesLocal);
    saveInvoicesToStorage(newInvoicesLocal);

    try {
      const syncedInvoices = await import('../services/googleSheetService').then(m => m.updateInGoogleSheet(updatedInvoice));
      if (syncedInvoices && syncedInvoices.length > 0) {
        const finalInvoices = syncedInvoices.map(inv => ({ ...inv, status: 'saved' as const }));
        saveInvoicesToStorage(finalInvoices);
        setInvoices(finalInvoices);
      } else {
        // If sync returns empty but didn't error, usually means success but no data return (rare with current script)
        // We keep optimistic state.
      }
    } catch (error) {
      console.error("Failed to sync update to Google Sheet:", error);
      // Revert to original state on critical failure to avoid data inconsistency UI
      setInvoices(currentInvoices);
      saveInvoicesToStorage(currentInvoices);
      alert("Failed to save changes to server. Please try again.");
    }
  }, []);


  const deleteInvoice = useCallback(async (invoiceId: string) => {
    // Optimistic delete
    const currentInvoices = getInvoicesFromStorage();
    const newInvoicesLocal = currentInvoices.filter((invoice) => invoice.id !== invoiceId);
    saveInvoicesToStorage(newInvoicesLocal);
    setInvoices(newInvoicesLocal);

    try {
      const syncedInvoices = await import('../services/googleSheetService').then(m => m.deleteFromGoogleSheet(invoiceId));
      if (syncedInvoices && syncedInvoices.length > 0) {
        const finalInvoices = syncedInvoices.map(inv => ({ ...inv, status: 'saved' as const }));
        saveInvoicesToStorage(finalInvoices);
        setInvoices(finalInvoices);
      }
    } catch (error) {
      console.error("Failed to sync delete to Google Sheet:", error);
    }
  }, []);

  return { invoices, addInvoice, updateInvoice, deleteInvoice, loading, refreshInvoices };
};