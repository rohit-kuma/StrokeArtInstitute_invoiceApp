import { Invoice } from '../types';

interface GoogleSheetPayload {
  date: string;
  time: string;
  vendorName: string;
  invoiceNumber: string;
  totalAmount: number;
  lineItems: string; // JSON string
  fileName: string;
}

export const saveToGoogleSheet = async (invoice: Invoice): Promise<void> => {
  // TODO: Replace with actual Web App URL provided by the user
  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || '';

  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('Google Sheet Connector URL is not configured.');
  }

  const payload: GoogleSheetPayload = {
    date: invoice.invoiceDate || '',
    time: invoice.invoiceTime || '',
    vendorName: invoice.vendorName || '',
    invoiceNumber: invoice.invoiceNumber || '',
    totalAmount: invoice.totalAmount || 0,
    lineItems: JSON.stringify(invoice.lineItems),
    fileName: invoice.fileName || 'Manual Entry',
  };

  try {
    // Google Apps Script requires no-cors for simple posts usually, 
    // but that prevents reading the response. 
    // Usually standard fetch works if the script is set to "Anyone" and returns JSON.
    // However, CORS issues are common. simple 'no-cors' is safer if we just want to fire and forget
    // or if we accept opaque response.
    // Ideally the script should return JSONP or support CORS.
    // For now, we will try a standard POST.

    // Note: 'Content-Type': 'application/json' generally triggers preflight which GAS doesn't handle well.
    // Using 'application/x-www-form-urlencoded' or 'text/plain' is often more reliable for GAS.
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
  } catch (error) {
    console.error('Error saving to Google Sheet:', error);
    throw error;
  }
};
