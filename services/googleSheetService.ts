import { type Invoice } from '../types';

/**
 * Simulates saving a single invoice record to a Google Sheet.
 * In a real-world application, this would involve using the Google Sheets API
 * with proper authentication (OAuth2) on a secure backend server.
 * For this client-side demo, we simulate the network request and log the action.
 */
export const saveToGoogleSheet = async (invoice: Invoice): Promise<void> => {
  console.log('Attempting to sync invoice to Google Sheets...');
  
  // Simulate network latency of an API call
  await new Promise(resolve => setTimeout(resolve, 1200));

  // In a real implementation, you would format the data as a row
  // and append it to the specified sheet.
  const sheetRow = [
    invoice.vendorName || 'N/A',
    invoice.invoiceNumber || 'N/A',
    invoice.invoiceDate || 'N/A',
    invoice.invoiceTime || 'N/A',
    invoice.totalAmount || 0,
    invoice.taxAmount || 0,
    JSON.stringify(invoice.lineItems) // Storing complex data as JSON string
  ];
  
  console.log('--- SYNC SUCCESS ---');
  console.log('Sheet: stroke_art_invoice.gsheet');
  console.log('Data sent:', sheetRow);
  
  // This would be a return from the actual API call
  return Promise.resolve();
};
