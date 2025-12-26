import { GoogleGenAI, Type } from '@google/genai';
import { type Invoice } from '../types';

// FIX: Correctly use import.meta.env.VITE_API_KEY for Vite environment variables.
const apiKey = import.meta.env.VITE_API_KEY;
if (!apiKey) {
    // This check is useful for local development, but secrets should be set in production.
    console.error("VITE_API_KEY is not configured in the environment.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });
// Model selection is now handled dynamically within parseInvoice fallback logic

/**
 * Converts a File object to the GoogleGenAI.Part format for API calls.
 * @param file The file to convert.
 * @returns A promise that resolves to a GenerativePart object.
 */
const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: base64EncodedData,
            mimeType: file.type,
        },
    };
};

const invoiceSchema = {
    type: Type.OBJECT,
    properties: {
        vendorName: { type: Type.STRING, description: 'The name of the company or person being paid. For a receipt that says "Paid to John Doe", the vendor is "John Doe".' },
        invoiceNumber: { type: Type.STRING, description: 'The unique identifier for the invoice. Can be null if not found.' },
        invoiceDate: { type: Type.STRING, description: 'The date the invoice was issued, in YYYY-MM-DD format. If the input text contains a relative date like "today", you MUST convert it to the current date in YYYY-MM-DD format.' },
        invoiceTime: { type: Type.STRING, description: 'The time the invoice was issued, in HH:MM 24-hour format. Can be null if not present.' },
        lineItems: {
            type: Type.ARRAY,
            description: 'A list of all items or services being billed. For a simple payment receipt with only a total, create a single line item with a generic description like "Payment" or "Service".',
            items: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: 'The name or description of the line item.' },
                    quantity: { type: Type.NUMBER, description: 'The quantity of the item.' },
                    unitPrice: { type: Type.NUMBER, description: 'The price for a single unit of the item.' },
                    subtotal: { type: Type.NUMBER, description: 'The total cost for this line item (quantity * unit price).' },
                },
                required: ['description', 'quantity', 'unitPrice', 'subtotal'],
            },
        },
        totalAmount: { type: Type.NUMBER, description: 'The final, total amount due on the invoice. Must be a positive number.' },
    },
    required: ['vendorName', 'invoiceDate', 'totalAmount', 'lineItems'],
};

export const parseInvoice = async (input: File[] | string, recentVendors: string[] = []): Promise<Partial<Invoice>> => {


    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    // Construct vendor context string
    const vendorContext = recentVendors.length > 0
        ? `\n        Common recent vendors for this user include: ${recentVendors.join(', ')}. Use this list to help identify the vendor if the document is unclear.`
        : '';

    const prompt = `
        You are an expert invoice processing AI. Your task is to accurately extract structured data from the provided content.
        The content could be plain text, an image of an invoice, or a payment receipt.
        
        The current date is ${today}. Please use this as the reference for "today".
        ${vendorContext}

        Please extract the following information and return it as a single, valid JSON object that strictly adheres to the provided schema. Do not wrap it in markdown backticks.
        - vendorName: The name of the company or person that was paid. Treat the name in phrases like "Sent to [Name]","received from [Name]", "Paid to [Name]", or "paid by [Name]" as the vendor.
        - invoiceDate: Format as YYYY-MM-DD. If a relative date like "today" is mentioned, you must resolve it to the current date, which is ${today}.
        - lineItems: For simple payment receipts that only show a total amount, you MUST create a single line item. For example: { "description": "Payment", "quantity": 1, "unitPrice": TOTAL_AMOUNT, "subtotal": TOTAL_AMOUNT }. An empty array is only acceptable if the total amount is zero.
        - totalAmount: The final amount. This value must be a positive number. If you cannot determine a positive amount, return null instead of 0 or a negative number.

        Capitalize the first letter of each word in the vendor's name (e.g., "john doe" becomes "John Doe").
    `;

    const parts = [];
    if (typeof input === 'string') {
        parts.push({ text: input });
    } else {
        const fileParts = await Promise.all(input.map(fileToGenerativePart));
        parts.push(...fileParts);
    }
    parts.push({ text: prompt });

    let lastError: any = null;

    // Priority: Top Performer -> Backup -> Stable Fallback -> Generic Latest -> Lite (Max Coverage)
    const modelPriority = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemini-2.0-flash-001',
        'gemini-flash-latest',
        'gemini-2.0-flash-lite-preview-02-05',
        'gemini-2.5-flash-lite'
    ];

    for (const model of modelPriority) {
        try {
            console.log(`Attempting invoice parsing with model: ${model}`);

            const response = await ai.models.generateContent({
                model: model,
                contents: { parts },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: invoiceSchema,
                },
            });

            const jsonText = response.text.trim();
            if (!jsonText) {
                throw new Error('Received an empty response from the AI.');
            }

            const parsedData = JSON.parse(jsonText);
            return parsedData as Partial<Invoice>;

        } catch (e: any) {
            console.warn(`Model ${model} failed:`, e.message);
            lastError = e;
            // Continue to next model in list
        }
    }

    // If loop finishes, all models failed
    console.error("All models failed. Last error:", lastError);
    if (lastError?.message?.includes('SAFETY')) {
        throw new Error('The request was blocked due to safety settings.');
    }
    throw new Error(`Failed to parse invoice after trying multiple models. Last error: ${lastError?.message}`);
};
