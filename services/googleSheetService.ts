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
// Update return type to Promise<Invoice[]>
export const saveToGoogleSheet = async (invoice: Invoice, action: 'create' | 'update' | 'delete' = 'create'): Promise<Invoice[]> => {
  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || '';

  console.log(`DEBUG: Attempting to ${action} in Google Sheet...`);
  console.log("DEBUG: VITE_GOOGLE_SHEET_URL Configured:", !!GOOGLE_SCRIPT_URL);

  if (!GOOGLE_SCRIPT_URL) {
    console.error("CRITICAL ERROR: Google Sheet URL is missing in this environment.");
    throw new Error('Google Sheet Connector URL is not configured. Please check your deployment secrets.');
  }

  // Update logic: Use keys that match the Google Sheet Headers exactly
  // Sanitize Time to HH:mm locally as well
  let timeToSend = invoice.invoiceTime;
  if (timeToSend && timeToSend !== 'null' && timeToSend.includes(':')) {
    // match HH:mm pattern
    const match = timeToSend.match(/(\d{1,2}:\d{2})/);
    if (match) timeToSend = match[0];
  } else if (!timeToSend || timeToSend === 'null') {
    timeToSend = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const payload: GoogleSheetPayload & { action: string; id?: string } = {
    "Date": invoice.invoiceDate || '',
    "Time": timeToSend || '',
    "Vendor Name": invoice.vendorName || '',
    "Invoice Number": invoice.invoiceNumber || '',
    "Total Amount": invoice.totalAmount || 0,
    "Line Items": JSON.stringify(invoice.lineItems),
    "File Name": invoice.fileName || 'Manual Entry',
    "action": action,
    "id": invoice.id || invoice.invoiceNumber || ''
  };

  try {
    console.log(`Sending ${action} request to Google Sheet... Payload:`, JSON.stringify(payload));

    // IMPORTANT: removed 'no-cors' mode so we can read the response
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
      return [];
    }

  } catch (error) {
    console.error(`Error performing ${action} on Google Sheet:`, error);
    throw error;
  }
};

export const updateInGoogleSheet = async (invoice: Invoice): Promise<Invoice[]> => {
  return saveToGoogleSheet(invoice, 'update');
};

export const deleteFromGoogleSheet = async (invoiceId: string): Promise<Invoice[]> => {
  // Partial invoice object for delete, we mainly need the ID
  const dummyInvoice = { id: invoiceId, invoiceNumber: invoiceId } as Invoice;
  return saveToGoogleSheet(dummyInvoice, 'delete');
};

// New function: Fetch all invoices (GET request)
export const fetchInvoices = async (): Promise<Invoice[]> => {
  const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || '';

  if (!GOOGLE_SCRIPT_URL) {
    console.error("CRITICAL ERROR: Google Sheet URL is missing.");
    return [];
  }

  try {
    console.log("Fetching invoices from Google Sheet...");

    // IMPORTANT: removed 'no-cors' mode so we can read the response
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'GET',
    });

    const result = await response.json();
    console.log("Google Sheet Fetch Response:", result);

    if (result.result === 'success' && result.invoices) {
      return result.invoices;
    } else {
      return [];
    }

  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};
