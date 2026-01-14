import React, { useState, useRef, useEffect } from 'react';
import type { Dialogue } from '../types';
import { generateDialogue, generateSpeech } from '../services/geminiService';
import { createWavBlob, decode } from '../utils/audioUtils';
import { LoaderIcon, FileUploadIcon, DownloadIcon } from './icons';

// Declare global variables for libraries loaded via script tags
declare const pdfjsLib: any;
declare const mammoth: any;

const PodcastGenerator: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [dialogue, setDialogue] = useState<Dialogue | null>(null);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // States for file handling
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isFileProcessing, setIsFileProcessing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Configure PDF.js worker from CDN
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (audioSrc) {
                URL.revokeObjectURL(audioSrc);
            }
        };
    }, [audioSrc]);

    const processFile = async (file: File) => {
        setIsFileProcessing(true);
        setError(null);
        setFileName(null);

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!['txt', 'pdf', 'docx'].includes(extension || '')) {
            setError('Unsupported file type. Please upload a .txt, .pdf, or .docx file.');
            setIsFileProcessing(false);
            return;
        }

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                if (!event.target?.result) throw new Error("Failed to read file.");
                const arrayBuffer = event.target.result as ArrayBuffer;
                let text = '';

                switch (extension) {
                    case 'txt':
                        text = new TextDecoder().decode(arrayBuffer);
                        break;
                    case 'pdf':
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            text += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                        }
                        break;
                    case 'docx':
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        text = result.value;
                        break;
                }
                setInputText(text);
                setFileName(file.name);
            } catch (err) {
                 setError(err instanceof Error ? `Error processing file: ${err.message}` : 'An unknown error occurred while processing the file.');
            } finally {
                setIsFileProcessing(false);
            }
        };

        reader.onerror = () => {
            setError('Failed to read the file.');
            setIsFileProcessing(false);
        };

        reader.readAsArrayBuffer(file);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading && !isFileProcessing) setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (isLoading || isFileProcessing) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
        // Reset input value to allow re-uploading the same file
        e.target.value = '';
    };

    const handleBrowseClick = () => {
        if (!isLoading && !isFileProcessing) {
            fileInputRef.current?.click();
        }
    };
    
    const handleSubmit = async () => {
        if (!inputText.trim()) {
            setError('Please enter some text to generate a podcast from.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setDialogue(null);
        setAudioSrc(null);
        setAudioBlob(null);
        
        try {
            setLoadingStep('Generating dialogue script...');
            const generatedDialogue = await generateDialogue(inputText);
            setDialogue(generatedDialogue);

            setLoadingStep('Synthesizing audio...');
            const base64Audio = await generateSpeech(generatedDialogue);
            const pcmData = decode(base64Audio);
            
            const wavBlob = createWavBlob(pcmData, 24000, 1);
            setAudioBlob(wavBlob);
            const url = URL.createObjectURL(wavBlob);
            setAudioSrc(url);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
            setLoadingStep('');
        }
    };

    const handleDownloadPodcast = () => {
        if (!audioBlob) return;
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'podcast.wav';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-indigo-400 mb-2">Podcast Generator</h2>
                <p className="text-gray-400">Upload a document or paste text below, and we'll transform it into a two-person podcast dialogue with audio.</p>
            </div>

            <div>
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    disabled={isLoading || isFileProcessing}
                />
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleBrowseClick}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors duration-200
                        ${isDraggingOver ? 'border-indigo-400 bg-gray-700/50' : 'border-gray-600'}
                        ${(isLoading || isFileProcessing) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-500'}
                    `}
                >
                    {isFileProcessing ? (
                        <>
                            <LoaderIcon />
                            <p className="mt-2 text-gray-400">Processing file...</p>
                        </>
                    ) : (
                        <>
                            <FileUploadIcon />
                            <p className="mt-2 text-sm text-gray-400">
                                <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">Supported formats: TXT, PDF, DOCX</p>
                            {fileName && <p className="mt-2 text-sm text-green-400 font-medium">Loaded: {fileName}</p>}
                        </>
                    )}
                </div>
            </div>

            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="The content of your uploaded file will appear here, or you can paste text directly."
                className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                disabled={isLoading || isFileProcessing}
            />

            <button
                onClick={handleSubmit}
                disabled={isLoading || !inputText || isFileProcessing}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            >
                {isLoading ? <><LoaderIcon /> {loadingStep}</> : 'Generate Podcast'}
            </button>

            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg">{error}</div>}
            
            {dialogue && (
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-200">Generated Dialogue</h3>
                     {audioSrc && (
                        <div className="sticky top-4 z-10 bg-gray-800 py-2 flex items-center gap-4">
                             <audio ref={audioRef} src={audioSrc} controls className="w-full" />
                             <button
                                onClick={handleDownloadPodcast}
                                disabled={!audioBlob}
                                className="flex items-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:bg-gray-700/50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap"
                                aria-label="Download Podcast"
                             >
                                <DownloadIcon />
                                Download
                             </button>
                        </div>
                     )}
                    <div className="max-h-96 overflow-y-auto bg-gray-900 p-4 rounded-lg space-y-3 border border-gray-700">
                        {dialogue.map((turn, index) => (
                            <div key={index} className={`flex ${turn.speaker === 'Alex' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-md p-3 rounded-lg ${turn.speaker === 'Alex' ? 'bg-blue-900/50' : 'bg-purple-900/50'}`}>
                                    <p className="font-bold text-sm">{turn.speaker}</p>
                                    <p>{turn.line}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PodcastGenerator;