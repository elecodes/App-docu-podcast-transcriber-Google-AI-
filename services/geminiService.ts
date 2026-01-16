import { GoogleGenAI, Part } from '@google/genai';
import { DIALOGUE_SPEAKERS, DIALOGUE_SCHEMA } from '../constants';
import { Dialogue } from '../types';

if (!process.env.API_KEY) {
    throw new Error('API_KEY environment variable is not set');
}

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function getFile(file: File): Promise<Part> {
    const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

    return {
        inlineData: {
            mimeType: file.type,
            data: base64,
        },
    };
}

const handleError = (error: any, context: string) => {
    console.error(`Error ${context}:`, error);
    const message = error.message || '';
    if (message.includes('429') || message.includes('Quota exceeded') || message.includes('RESOURCE_EXHAUSTED')) {
        const retryMatch = message.match(/retry in ([\d.]+)s/);
        const retryTime = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 'a minute';
        throw new Error(`API Quota Exceeded. Please wait ${retryTime} seconds and try again.`);
    }
    throw new Error(`Failed to ${context}. ${message}`);
};

export async function generatePodcast(prompt: string, file: File): Promise<Dialogue> {
    const audioFile = await getFile(file);
    const fullPrompt = `${prompt}\n\n${JSON.stringify(DIALOGUE_SCHEMA)}`;

    try {
        console.log('Generating podcast with model:', 'gemini-2.5-flash');
        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    parts: [
                        { text: fullPrompt },
                        audioFile
                    ]
                }
            ]
        });
        
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json\n?|\n?```/g, '').trim();
        
        if (!jsonText) {
            throw new Error('Empty response from model');
        }
        return JSON.parse(jsonText) as Dialogue;
    } catch (error) {
        handleError(error, 'generating podcast');
        return [] as Dialogue; // Unreachable but satisfies TS
    }
}

export async function transcribeAudio(file: File): Promise<string> {
    const audioFile = await getFile(file);
    const prompt = 'Listen to this audio and transcribe it.';

    try {
        console.log('Transcribing audio with model:', 'gemini-2.5-flash');
        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    parts: [
                        { text: prompt },
                        audioFile
                    ]
                }
            ]
        });
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || '';
    } catch (error) {
        handleError(error, 'transcribing audio');
        return '';
    }
}

export async function generateDialogue(text: string): Promise<Dialogue> {
    const prompt = `Generate a SHORT podcast dialogue (Demo Mode) between two speakers, Alex and Ben, based on the following text. 
    Task: Create a conversation where they discuss the MAIN POINTS and key takeaways of the text. Do NOT just read it verbatim.
    Constraint: The dialogue MUST be limited to approx 4-6 turns (total) to create a concise 30-60 second demo.
    The output MUST be a valid JSON object matching this schema:\n\n${JSON.stringify(DIALOGUE_SCHEMA)}\n\nText content:\n${text}`;

    try {
        console.log('Generating dialogue with model:', 'gemini-2.5-flash');
        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        });

        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json\n?|\n?```/g, '').trim();
        
        if (!jsonText) {
            throw new Error('Empty response from model');
        }
        return JSON.parse(jsonText) as Dialogue;
    } catch (error) {
        handleError(error, 'generating dialogue');
        return [] as Dialogue;
    }
}

export async function generateSpeech(dialogue: Dialogue): Promise<string> {
    const script = dialogue.map(turn => `${turn.speaker}: ${turn.line}`).join('\n\n');
    const prompt = `Read the following podcast dialogue out loud. Use different voices or tones for the two speakers, Alex and Ben. Alex should sound energetic and Ben should sound thoughtful.\n\n${script}`;
    
    return new Promise(async (resolve, reject) => {
        try {
            console.log('Generating speech with Live/WebSocket model:', 'gemini-2.5-flash-native-audio-preview-09-2025');
            
            let audioAccumulator: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let session: any = null;

            session = await genAI.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: ['AUDIO' as any],
                },
                callbacks: {
                    onopen: () => {
                        console.log('Live API Session Opened');
                    },
                    onmessage: (message: any) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            audioAccumulator.push(base64Audio);
                        }
                        
                        if (message.serverContent?.turnComplete) {
                            session.close();
                            resolve(audioAccumulator.join(''));
                        }
                    },
                    onerror: (err: any) => {
                        console.error('Live API Error:', err);
                        reject(err);
                    },
                    onclose: () => {
                        console.log('Live API Session Closed');
                        if (audioAccumulator.length > 0) {
                            console.log('Resolving with accumulated audio on close.');
                            resolve(audioAccumulator.join(''));
                        } else {
                            // If we accumulated audio, effectively we're good, so maybe resolve?
                            // But if turnComplete didn't happen, it might be partial.
                            // Previous logic rejected if empty.
                            if (audioAccumulator.length === 0) {
                                reject(new Error('Session closed without receiving audio.'));
                             }
                        }
                    }
                }
            });

            // Send the prompt once the session is established and assigned
            await session.sendClientContent({
                turns: [{ parts: [{ text: prompt }] }],
                turnComplete: true
            });

        } catch (error) {
            handleError(error, 'generating speech via Live API');
            reject(error);
        }
    });
}