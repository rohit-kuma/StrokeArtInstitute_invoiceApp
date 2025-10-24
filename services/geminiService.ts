import { GoogleGenAI, Type } from '@google/genai';
import { type Invoice } from '../types';

// FIX: This file was empty and causing build errors. It has been implemented to use the Gemini API.

// Per instructions, API key is from environment variables.
// In a Vite app, this would typically be `import.meta.env.VITE_API_KEY`,
// but following project guidelines to use `process.env.API_KEY`.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    // For this client-side demo, we'll alert the user and throw an error.
    // In a real app, this should be handled more gracefully, perhaps disabling the feature.
    alert("API_KEY is not configured. Please set it up to use the AI features.");
    throw new Error('API_KEY is not set in environment variables.');
}

// Initialize the Google Gemini API client
const ai = new GoogleGenAI({ apiKey: API_KEY });
// Use a fast and capable model for this task.
const modelName = 'gemini-2.5-flash';

/**
 * Converts a File object to the GoogleGenAI.Part format for API calls.
 * @param file The file to convert.
 * @returns A promise that resolves to a GenerativePart object.
 */
const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        // The result includes the Base64 prefix `data:mime/type;base64,`, which we need to remove.
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

// Defines the expected JSON schema for the invoice data.
// This helps the model return consistent, structured output.
const invoiceSchema = {
    type: Type.OBJECT,
    properties: {
        vendorName: { type: Type.STRING, description: 'The name of the company or vendor issuing the invoice.' },
        invoiceNumber: { type: Type.STRING, description: 'The unique identifier for the invoice. Can be null if not found.' },
        invoiceDate: { type: Type.STRING, description: 'The date the invoice was issued, in YYYY-MM-DD format.' },
        invoiceTime: { type: Type.STRING, description: 'The time the invoice was issued, in HH:MM 24-hour format. Can be null if not present.' },
        lineItems: {
            type: Type.ARRAY,
            description: 'A list of all items or services being billed. Can be an empty array for simple receipts.',
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
        taxAmount: { type: Type.NUMBER, description: 'The total amount of tax charged on the invoice. Can be null if not present.' },
        totalAmount: { type: Type.NUMBER, description: 'The final, total amount due on the invoice.' },
    },
    // The model should always try to return these fields.
    required: ['vendorName', 'invoiceDate', 'totalAmount'],
};


/**
 * Parses an invoice from either a text string or an array of files using the Gemini API.
 * @param input The invoice content, which can be a string or an array of File objects.
 * @returns A promise that resolves to a partially parsed Invoice object.
 */
export const parseInvoice = async (input: File[] | string): Promise<Partial<Invoice>> => {
    
    const prompt = `
        You are an expert invoice processing AI. Your task is to accurately extract structured data from the provided invoice content.
        The content could be plain text, an image of an invoice, or another document format.
        
        Please extract the following information and return it as a single, valid JSON object that strictly adheres to the provided schema. Do not wrap it in markdown backticks.
        - vendorName: The name of the company that sent the invoice.
        - invoiceNumber: The unique ID of the invoice. If none is found, return "null".
        - invoiceDate: The date the invoice was created. Format it as YYYY-MM-DD.
        - invoiceTime: The time the invoice was created, if available. Format as HH:MM (24-hour). If not present, this can be null.
        - lineItems: An array of all purchased items. Each item must have a description, quantity, unitPrice, and subtotal. If no line items are present (like on a simple receipt), return an empty array [].
        - taxAmount: The total tax amount. If not specified, return null.
        - totalAmount: The final amount due.

        If any required field is not found, do your best to infer it or use a sensible default like "null" for strings. The 'totalAmount' is critical.
    `;
    
    const parts = [];

    if (typeof input === 'string') {
        parts.push({ text: input });
    } else if (Array.isArray(input) && input.length > 0) {
        // Convert all files to the generative part format
        const fileParts = await Promise.all(input.map(fileToGenerativePart));
        parts.push(...fileParts);
    } else {
        throw new Error('Invalid input for parseInvoice. Please provide text or at least one file.');
    }
    
    // The prompt is always added as the final instruction part.
    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: invoiceSchema,
            },
        });
        
        // Per guidelines, access the text directly from the response.
        const jsonText = response.text.trim();

        if (!jsonText) {
            throw new Error('Received an empty response from the AI. The invoice may be unreadable.');
        }

        // The API should return valid JSON because of the schema, but we parse it safely.
        const parsedData = JSON.parse(jsonText);
        
        return parsedData as Partial<Invoice>;
        
    } catch (e: any) {
        console.error("Error calling Gemini API:", e);
        // Provide more user-friendly error messages based on common issues.
        if (e.message.includes('SAFETY')) {
            throw new Error('The request was blocked due to safety settings. The content may be inappropriate.');
        }
        if (e.message.includes('400')) {
             throw new Error('There was an issue with the request sent to the AI. Please check if the file format is supported or if the text is valid.');
        }
        throw new Error(`Failed to parse the invoice. The AI returned an error: ${e.message}`);
    }
};
