import { Invoice } from '../types';

interface GoogleSheetPayload {
  Date: string;
  Time: string;
  "Vendor Name": string;
  "Invoice Number": string;
  "Total Amount": number;
  "Line Items": string; // JSON string
  "File Name": string;
}

export const saveToGoogleSheet = async (invoice: Invoice): Promise<void> => {
  // TODO: Replace with actual Web App URL provided by the user
  // TODO: Replace with actual Web App URL provided by the user
  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || '';

  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('Google Sheet Connector URL is not configured.');
  }

  // Update logic: Use keys that match the Google Sheet Headers exactly
  const payload: GoogleSheetPayload = {
    "Date": invoice.invoiceDate || '',
    "Time": invoice.invoiceTime || '',
    "Vendor Name": invoice.vendorName || '',
    "Invoice Number": invoice.invoiceNumber || '',
    "Total Amount": invoice.totalAmount || 0,
    "Line Items": JSON.stringify(invoice.lineItems),
    "File Name": invoice.fileName || 'Manual Entry',
  };

  try {
    console.log("Saving to Google Sheet...", payload);

    // Use no-cors to treat as a "simple request" and avoid OPTIONS preflight
    // which can sometimes cause double-invocations in Apps Scripts or CORS errors.
    // Note: With no-cors, we cannot read the response status (it will be opaque),
    // but the request will be sent.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Ensure simple request
      },
      body: JSON.stringify(payload),
    });

    console.log("Request sent to Google Sheet.");

  } catch (error) {
    console.error('Error saving to Google Sheet:', error);
    // With no-cors, network errors might still catch here, but 4xx/5xx wont.
    throw error;
  }
};
