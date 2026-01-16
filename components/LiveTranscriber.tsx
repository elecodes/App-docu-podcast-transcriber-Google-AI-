import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
// Fix: `LiveSession` is not an exported member of `@google/genai`. Using global Blob type.
import { createBlob } from '../utils/audioUtils';
import { MicIcon, StopIcon, LoaderIcon, DownloadIcon } from './icons';

// Fix: `LiveSession` is not an exported member of `@google/genai`.
// Defining the interface locally based on its usage in the component.
interface LiveSession {
    sendRealtimeInput: (input: { media: Blob }) => void;
    close: () => void;
}

const LiveTranscriber: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const stopListening = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.close();
            }).catch(console.error);
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        setIsListening(false);
        setIsConnecting(false);
    }, []);

    const startListening = async () => {
        if (isListening || isConnecting) return;
        
        setIsConnecting(true);
        setError(null);
        setTranscript('');

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Fix: Cast window to `any` to allow access to legacy `webkitAudioContext` for broader browser support.
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Session opened.');
                        setIsConnecting(false);
                        setIsListening(true);
                        
                        // Start streaming audio
                        mediaStreamSourceRef.current = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current!.destination);
                    },
                    onmessage: (message) => {
                        const newText = message.serverContent?.inputTranscription?.text;
                        if (newText) {
                            setTranscript(prev => prev + newText);
                        }

                        // Per Gemini API guidelines, audio output from the model must be handled even if not used.
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            // This component is for transcription only, so the audio response is ignored.
                        }
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setError('A session error occurred. Please try again.');
                        stopListening();
                    },
                    onclose: () => {
                        console.log('Session closed.');
                        stopListening();
                    },
                },
                config: {
                    inputAudioTranscription: {},
                    // Fix: Per Gemini API guidelines, `responseModalities` MUST be `[Modality.AUDIO]` for live sessions.
                    responseModalities: [Modality.AUDIO]
                },
            });

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to start microphone.');
            stopListening();
        }
    };

    useEffect(() => {
        return () => {
            stopListening();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleSaveTranscript = () => {
        if (!transcript.trim()) return;
        const blob = new window.Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'transcript.txt';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-indigo-400 mb-2">Live Transcriber</h2>
                <p className="text-gray-400">Click "Live Transcriber" and speak into your microphone. Your words will be transcribed in real-time.</p>
            </div>

            <button
                onClick={handleToggleListening}
                disabled={isConnecting}
                className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-bold transition-all duration-200 ${
                    isListening 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:bg-gray-500 disabled:cursor-wait`}
            >
                {isConnecting ? <LoaderIcon /> : isListening ? <StopIcon /> : <MicIcon />}
                {isConnecting ? 'Connecting...' : isListening ? 'Stop Listening' : 'Start Listening'}
            </button>

            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg">{error}</div>}

            <div className="w-full min-h-[200px] bg-gray-900 p-4 rounded-lg border-2 border-gray-600">
                <p className="text-gray-300 whitespace-pre-wrap">{transcript || (isListening ? 'Listening...' : 'Transcript will appear here.')}</p>
            </div>
             <button
                onClick={handleSaveTranscript}
                disabled={!transcript.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 disabled:bg-gray-700/50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            >
                <DownloadIcon />
                Save Transcript
            </button>
        </div>
    );
};

export default LiveTranscriber;