// FIX: Replaced incorrect HTML content with actual TypeScript type definitions.

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  status: 'parsed' | 'saved';
  fileName?: string | null;
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceTime?: string | null;
  totalAmount: number | null;
  lineItems: LineItem[];
}

export type ViewType = 'upload' | 'invoices' | 'analytics';
