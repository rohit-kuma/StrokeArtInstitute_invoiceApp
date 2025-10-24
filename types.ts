
export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceTime?: string | null;
  lineItems: LineItem[];
  taxAmount: number | null;
  totalAmount: number | null;
  fileName?: string;
  status: 'parsed' | 'saved';
}

export type ViewType = 'upload' | 'invoices' | 'analytics' | 'settings';