import { GoogleGenAI, Type } from "@google/genai";
import { type Invoice } from "../types";

// FIX: Aligned with Gemini API guidelines for API key initialization.
// The API key must be provided via the `process.env.API_KEY` environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const invoiceSchema = {
  type: Type.OBJECT,
  properties: {
    vendorName: { type: Type.STRING, description: "The name of the vendor or company issuing the invoice." },
    invoiceNumber: { type: Type.STRING, description: "The unique identifier for the invoice." },
    invoiceDate: { type: Type.STRING, description: "The date the invoice was issued, in YYYY-MM-DD format." },
    invoiceTime: { type: Type.STRING, description: "The time the invoice was issued or payment was made, in HH:MM (24-hour) format if available." },
    lineItems: {
      type: Type.ARRAY,
      description: "A list of all items or services being billed.",
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Description of the item or service." },
          quantity: { type: Type.NUMBER, description: "The quantity of the item." },
          unitPrice: { type: Type.NUMBER, description: "The price per unit of the item." },
          subtotal: { type: Type.NUMBER, description: "The total price for this line item (quantity * unitPrice)." },
        },
        required: ["description", "quantity", "unitPrice", "subtotal"],
      },
    },
    taxAmount: { type: Type.NUMBER, description: "The total amount of tax charged." },
    totalAmount: { type: Type.NUMBER, description: "The final total amount due for the invoice." },
  },
  required: ["vendorName", "invoiceNumber", "invoiceDate", "lineItems", "totalAmount"],
};


const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const parseInvoice = async (content: string | File[]): Promise<Partial<Invoice>> => {
  const model = "gemini-2.5-flash";
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

  const prompt = `
    You are an intelligent invoice processing assistant. 
    Analyze the following invoice data and extract the information into the structured JSON format defined by the schema.
    The data might be messy text from an OCR scan, a user's typed notes, or spoken words. Do your best to interpret it.
    
    SPECIAL INSTRUCTIONS:
    - If a value is not found, use null.
    - For dates, standardize them to YYYY-MM-DD format if possible. If the user mentions a relative date like "today", use the current date which is ${today}.
    - If a time of payment is mentioned (e.g., "at 3:00 PM", "paid 14:30"), extract it and format it as HH:MM (24-hour format). If not mentioned, use null for invoiceTime.
    - If the user mentions "received from [Name]" or the receipt shows "Paid to [Name]", that name should be the vendorName. For example, in "Rs 3000 received from Rohit kumar", the vendorName is "Rohit Kumar".
    - If no specific line items are found but a total amount is clear (like on a simple payment receipt), create a single line item. Use a generic description like "Payment" or "Service", set quantity to 1, and use the total amount for both the unitPrice and subtotal.
    - If an invoice number is not explicitly mentioned, set invoiceNumber to null. Do not invent one.
    - CRITICAL: All financial numbers (quantity, unitPrice, subtotal, taxAmount, totalAmount) MUST be positive numbers. If a value is unclear or appears negative, it is better to return null for that field than to provide an incorrect or negative value.
    
    The user input is:
  `;

  try {
    let parts: any[] = [];
    if (typeof content === 'string') {
        parts.push({ text: prompt + content });
    } else {
        parts.push({ text: prompt });
        for (const file of content) {
            if (file.type.startsWith('image/')) {
                parts.push(await fileToGenerativePart(file));
            } else if (file.type === 'text/plain') {
                const textContent = await file.text();
                parts.push({ text: `\n\n--- File Content: ${file.name} ---\n${textContent}` });
            }
        }
    }
    
    if (parts.length === 1 && typeof content !== 'string') {
        // Only prompt was added, no valid files
        throw new Error("No valid file content to parse. Please upload images or .txt files.");
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
      },
    });

    const parsedText = response.text.trim();
    const parsedJson = JSON.parse(parsedText);
    return parsedJson as Partial<Invoice>;
  } catch (error) {
    console.error("Error parsing invoice with Gemini API:", error);
    throw new Error("Failed to parse the invoice. The AI model could not process the request. Please check your input and try again.");
  }
};