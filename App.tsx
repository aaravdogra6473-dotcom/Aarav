import React, { useState, useCallback, useEffect } from 'react';
import { ProcessMode, SavedNote, SpeechRecognition } from './types';
import { processTextWithGemini } from './services/geminiService';
import Header from './components/Header';
import { MicrophoneIcon, SaveIcon, ShareIcon, CopyIcon, TrashIcon, CheckIcon } from './components/icons';

// Speech Recognition setup
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;
if (SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
}

interface Toast {
    id: number;
    message: string;
    icon: React.ReactNode;
}

const App: React.FC = () => {
    const [inputText, setInputText] = useState<string>('');
    const [outputText, setOutputText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [currentMode, setCurrentMode] = useState<ProcessMode | null>(null);
    const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const storedNotes = localStorage.getItem('ai-quick-notes');
        if (storedNotes) {
            setSavedNotes(JSON.parse(storedNotes));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('ai-quick-notes', JSON.stringify(savedNotes));
    }, [savedNotes]);

    const showToast = (message: string, icon: React.ReactNode) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, icon }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };
    
    const handleProcess = useCallback(async (mode: ProcessMode) => {
        if (!inputText.trim()) {
            setError('Please enter some text to process.');
            return;
        }
        if (!process.env.API_KEY) {
            setError("API key is not configured. Please set the API_KEY environment variable.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        setOutputText('');
        setCurrentMode(mode);

        const result = await processTextWithGemini(inputText, mode);
        
        if (result.startsWith("An error occurred:")) {
            setError(result);
        } else {
            setOutputText(result);
        }
        setIsLoading(false);
    }, [inputText]);

    const handleSaveNote = useCallback(() => {
        if (!outputText || !currentMode) return;
        const newNote: SavedNote = {
            id: Date.now().toString(),
            input: inputText,
            output: outputText,
            mode: currentMode,
            timestamp: new Date().toLocaleString(),
        };
        setSavedNotes(prev => [newNote, ...prev]);
        showToast("Note saved!", <SaveIcon className="w-5 h-5" />);
    }, [inputText, outputText, currentMode]);

    const handleDeleteNote = (id: string) => {
        setSavedNotes(prev => prev.filter(note => note.id !== id));
        showToast("Note deleted", <TrashIcon className="w-5 h-5" />);
    };

    const handleShare = useCallback(async (textToShare: string, title: string) => {
        const shareData = {
            title: title,
            text: textToShare,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                throw new Error("Web Share API not supported");
            }
        } catch (err) {
            handleCopyToClipboard(textToShare);
        }
    }, []);
    
    const handleCopyToClipboard = (textToCopy: string) => {
         navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("Copied to clipboard!", <CopyIcon className="w-5 h-5" />);
        });
    };

    const handleListen = () => {
        if (!recognition) return;
        
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setInputText(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };
        
        recognition.onend = () => {
            setIsListening(false);
        }
    };

    const renderFormattedText = (text: string) => {
        const sections = text.split(/(\*.*?\*|\*\*.*?\*\*|`.*?`|```[\s\S]*?```)/g);
        return sections.map((section, index) => {
            if (section.startsWith('**') && section.endsWith('**')) {
                return <strong key={index}>{section.slice(2, -2)}</strong>;
            }
            if (section.startsWith('*') && section.endsWith('*')) {
                return <em key={index}>{section.slice(1, -1)}</em>;
            }
            if (section.startsWith('```') && section.endsWith('```')) {
                 return <pre key={index} className="bg-slate-800 p-3 rounded-md my-2 whitespace-pre-wrap font-mono text-sm">{section.slice(3, -3).trim()}</pre>;
            }
             if (section.startsWith('`') && section.endsWith('`')) {
                return <code key={index} className="bg-slate-700 text-cyan-300 px-1.5 py-0.5 rounded-md font-mono text-sm">{section.slice(1, -1)}</code>;
            }
            // Handle bullet points
            if (section.startsWith('* ')) {
                return <li key={index} className="ml-5 list-disc">{section.substring(2)}</li>;
            }
            if (section.startsWith('- ')) {
                 return <li key={index} className="ml-5 list-disc">{section.substring(2)}</li>;
            }
            return section.split('\n').map((line, lineIndex) => (
                <React.Fragment key={`${index}-${lineIndex}`}>
                    {line}
                    {lineIndex < section.split('\n').length - 1 && <br />}
                </React.Fragment>
            ));
        });
    };

    return (
        <div className="min-h-screen bg-slate-900 font-sans p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Header />

                <main className="mt-8 space-y-8">
                    {/* Input Section */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-1">
                         <div className="relative">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Type, paste, or use the mic to enter text..."
                                className="w-full h-48 bg-transparent p-4 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none text-lg"
                            />
                            {recognition && (
                            <button
                                onClick={handleListen}
                                className={`absolute bottom-4 right-4 p-2 rounded-full transition-colors duration-200 ${isListening ? 'bg-red-500 text-white animate-pulse-fast' : 'bg-slate-700 hover:bg-cyan-600 text-slate-300'}`}
                                title={isListening ? 'Stop listening' : 'Start listening'}
                            >
                                <MicrophoneIcon className="w-6 h-6" />
                            </button>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-700">
                             <p className="text-sm text-slate-400">Select an action:</p>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                                {Object.values(ProcessMode).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => handleProcess(mode)}
                                        disabled={isLoading || !inputText.trim()}
                                        className="px-5 py-2.5 text-center font-semibold rounded-lg transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-600 text-white hover:bg-cyan-500 focus:ring-4 focus:ring-cyan-500/50 shadow-md disabled:shadow-none"
                                    >
                                        {isLoading && currentMode === mode ? 'Processing...' : mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">{error}</div>}

                    {/* Output Section */}
                    {isLoading && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-6 animate-pulse">
                            <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
                            <div className="space-y-3">
                                <div className="h-3 bg-slate-700 rounded"></div>
                                <div className="h-3 bg-slate-700 rounded w-5/6"></div>
                                <div className="h-3 bg-slate-700 rounded w-4/6"></div>
                                <div className="h-3 bg-slate-700 rounded w-5/6"></div>
                            </div>
                        </div>
                    )}

                    {outputText && !isLoading && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg">
                             <div className="p-6">
                                <h2 className="text-2xl font-bold text-cyan-400 mb-4">{currentMode} Result:</h2>
                                <div className="prose prose-invert prose-p:text-slate-300 prose-li:text-slate-300 text-slate-300 max-w-none leading-relaxed whitespace-pre-wrap">
                                    {renderFormattedText(outputText)}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 border-t border-slate-700 bg-slate-800/30 rounded-b-xl">
                                <button onClick={handleSaveNote} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                                    <SaveIcon className="w-5 h-5" /> Save Note
                                </button>
                                <button onClick={() => handleShare(outputText, `${currentMode} Result`)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors">
                                    <ShareIcon className="w-5 h-5" /> Share
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Saved Notes Section */}
                    {savedNotes.length > 0 && (
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold text-center text-slate-300 border-b-2 border-slate-700 pb-2">Saved Notes</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {savedNotes.map(note => (
                                    <div key={note.id} className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg flex flex-col">
                                        <div className="p-5 flex-grow">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="px-3 py-1 text-xs font-semibold text-cyan-200 bg-cyan-800/50 rounded-full">{note.mode}</span>
                                                <span className="text-xs text-slate-500">{note.timestamp}</span>
                                            </div>
                                            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{renderFormattedText(note.output)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 border-t border-slate-700 bg-slate-800/30 rounded-b-xl">
                                            <button onClick={() => handleShare(note.output, `${note.mode} Result`)} className="flex-1 flex justify-center items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                                                <ShareIcon className="w-4 h-4" /> Share
                                            </button>
                                             <button onClick={() => handleCopyToClipboard(note.output)} className="flex-1 flex justify-center items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                                                <CopyIcon className="w-4 h-4" /> Copy
                                            </button>
                                            <button onClick={() => handleDeleteNote(note.id)} className="flex-1 flex justify-center items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 bg-red-900/50 hover:bg-red-900 rounded-lg transition-colors">
                                                <TrashIcon className="w-4 h-4" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {/* Toast Notifications Container */}
            <div className="fixed bottom-5 right-5 z-50 space-y-3">
                {toasts.map(toast => (
                    <div key={toast.id} className="flex items-center gap-3 bg-slate-700 text-white px-4 py-2 rounded-lg shadow-xl animate-fade-in-out">
                       {toast.icon}
                       <span>{toast.message}</span>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translateY(10px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(10px); }
                }
                .animate-fade-in-out {
                    animation: fade-in-out 3s ease-in-out forwards;
                }
                @keyframes pulse-fast {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                    }
                    50% {
                        transform: scale(1.05);
                        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                    }
                }
                .animate-pulse-fast {
                    animation: pulse-fast 1.5s infinite;
                }
            `}</style>
        </div>
    );
};

export default App;
