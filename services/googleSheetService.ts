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

// Update return type to Promise<Invoice[]>
export const saveToGoogleSheet = async (invoice: Invoice): Promise<Invoice[]> => {
  // TODO: Replace with actual Web App URL provided by the user
  // TODO: Replace with actual Web App URL provided by the user
  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || '';

  console.log("DEBUG: Attempting to save to Google Sheet...");
  console.log("DEBUG: VITE_GOOGLE_SHEET_URL Configured:", !!GOOGLE_SCRIPT_URL);

  if (!GOOGLE_SCRIPT_URL) {
    console.error("CRITICAL ERROR: Google Sheet URL is missing in this environment.");
    throw new Error('Google Sheet Connector URL is not configured. Please check your deployment secrets.');
  }

  // Update logic: Use keys that match the Google Sheet Headers exactly
  const payload: GoogleSheetPayload = {
    "Date": invoice.invoiceDate || '',
    "Time": invoice.invoiceTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), // Default to HH:mm
    "Vendor Name": invoice.vendorName || '',
    "Invoice Number": invoice.invoiceNumber || '',
    "Total Amount": invoice.totalAmount || 0,
    "Line Items": JSON.stringify(invoice.lineItems),
    "File Name": invoice.fileName || 'Manual Entry',
  };

  try {
    console.log("Saving to Google Sheet...", payload);

    // IMPORTANT: removed 'no-cors' mode so we can read the response
    // Apps Script MUST be deployed as "Execute as: Me" and "Who has access: Anyone" for this to work with CORS.
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("Google Sheet Response:", result);

    if (result.result === 'success' && result.invoices) {
      return result.invoices;
    } else {
      // If no invoices returned but success, maybe empty list? 
      // Or if error logic handled by catch/response check
      return [];
    }

  } catch (error) {
    console.error('Error saving to Google Sheet:', error);
    throw error;
  }
};
