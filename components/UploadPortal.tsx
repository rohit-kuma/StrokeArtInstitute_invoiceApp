import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseInvoice } from '../services/geminiService';
import { type Invoice } from '../types';
import InvoiceTable from './InvoiceTable';
import { UploadIcon, MicIcon } from './icons/Icons';

// FIX: Add types for browser-specific SpeechRecognition API to avoid TypeScript errors.
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Check for SpeechRecognition API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
}


const UploadPortal: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');
    const [parsedInvoices, setParsedInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'text/plain': ['.txt'],
            'application/pdf': ['.pdf'], // Note: PDF/DOCX parsing is not supported on frontend
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        }
    });

    const handleParse = async () => {
        if (files.length === 0 && !textInput.trim()) {
            setError('Please upload a file, type, or speak the invoice details.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setParsedInvoices([]);
        
        try {
            if (textInput.trim()) {
                // Handle single text input
                const result = await parseInvoice(textInput);
                // FIX: Ensure all required fields from the Invoice type are present by providing default null values.
                // The result from `parseInvoice` is a partial object, so spreading it might miss required fields.
                const newInvoice: Invoice = {
                    id: `parsed-${Date.now()}`,
                    status: 'parsed',
                    fileName: 'Text/Voice Input',
                    vendorName: null,
                    invoiceNumber: null,
                    invoiceDate: null,
                    taxAmount: null,
                    totalAmount: null,
                    ...result,
                    lineItems: result.lineItems || [],
                };
                setParsedInvoices([newInvoice]);
            } else if (files.length > 0) {
                // Handle multiple files
                const parsedResults: Invoice[] = [];
                for (const file of files) {
                    try {
                        // Pass each file individually in an array to match the service signature
                        const result = await parseInvoice([file]); 
                        // FIX: Ensure all required fields from the Invoice type are present by providing default null values.
                        // The result from `parseInvoice` is a partial object, so spreading it might miss required fields.
                        parsedResults.push({
                            id: `parsed-${Date.now()}-${file.name}`,
                            status: 'parsed',
                            fileName: file.name,
                            vendorName: null,
                            invoiceNumber: null,
                            invoiceDate: null,
                            taxAmount: null,
                            totalAmount: null,
                            ...result,
                            lineItems: result.lineItems || [],
                        });
                    } catch (e: any) {
                        console.error(`Failed to parse ${file.name}:`, e);
                        // Future improvement: Show which files failed in the UI
                    }
                }
                setParsedInvoices(parsedResults);
            }
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleListen = () => {
        if (!recognition) {
            setError("Speech recognition is not supported in your browser.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    useEffect(() => {
        if (!recognition) return;

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTextInput(textInput + finalTranscript);
        };
        
        recognition.onerror = (event: any) => {
             console.error('Speech recognition error', event.error);
             setError(`Speech recognition error: ${event.error}`);
             setIsListening(false);
        };

        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, [textInput]);

    const handleRemoveParsedInvoice = (idToRemove: string) => {
        setParsedInvoices(prev => prev.filter(inv => inv.id !== idToRemove));
    };

    const resetPortal = () => {
        setFiles([]);
        setTextInput('');
        setParsedInvoices([]);
        setError(null);
        setIsLoading(false);
    };

    if (parsedInvoices.length > 0) {
        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Review Parsed Invoices</h2>
                <p className="text-gray-600 dark:text-gray-400 -mt-6">Review the AI-extracted data for each file below. You can make corrections before saving.</p>
                {parsedInvoices.map((invoice) => (
                    <InvoiceTable 
                        key={invoice.id} 
                        invoice={invoice} 
                        onComplete={() => handleRemoveParsedInvoice(invoice.id)} 
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">Invoice Upload Portal</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Upload, type, or speak your invoice details to be parsed by AI.</p>
            
            <div className="space-y-6">
                <div {...getRootProps()} className={`relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-xl transition-colors duration-300 cursor-pointer ${isDragActive ? 'border-accent-blue bg-accent-blue/10' : 'border-gray-300 dark:border-dark-border hover:border-accent-blue/50 dark:hover:border-accent-blue'}`}>
                    <input {...getInputProps()} />
                    <UploadIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-center text-gray-600 dark:text-gray-400">
                        {isDragActive ? 'Drop the files here...' : "Drag 'n' drop files here, or click to select"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Supports: Images (PNG, JPG), TXT. (PDF/DOCX support is limited in this demo)</p>
                </div>

                {files.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Selected Files:</h4>
                        <ul className="space-y-1">
                            {files.map((file, i) => (
                                <li key={i} className="text-sm p-2 bg-gray-100 dark:bg-dark-card rounded-md">{file.name}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="relative flex items-center">
                    <div className="w-full h-px bg-gray-300 dark:bg-dark-border"></div>
                    <span className="absolute left-1/2 -translate-x-1/2 bg-gray-100 dark:bg-dark-bg px-2 text-sm text-gray-500">OR</span>
                </div>

                <div className="relative">
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder='Type or paste invoice details here... e.g., "Invoice from Tech Solutions for $500 for web development, due 2024-10-26"'
                        className="w-full p-4 pr-12 bg-transparent border-2 border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-accent-blue focus:border-accent-blue transition-all"
                        rows={5}
                    />
                    <button onClick={toggleListen} className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse-slow' : 'hover:bg-accent-blue/10 text-gray-500'}`}>
                        <MicIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {error && <div className="p-3 text-red-700 bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-300 dark:border-red-500/50 rounded-md">{error}</div>}

                <button onClick={handleParse} disabled={isLoading} className="w-full bg-accent-blue text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-accent-glow">
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Parsing Invoice...
                        </>
                    ) : 'Parse with AI'}
                </button>
            </div>
        </div>
    );
};

export default UploadPortal;