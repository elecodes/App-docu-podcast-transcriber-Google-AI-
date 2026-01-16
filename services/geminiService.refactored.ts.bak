import { GoogleGenAI, GenerativeModel, Part, Content, GenerationConfig, RequestOptions, CountTokensRequest, GenerateContentRequest, GenerateContentResult, StartChatParams, ChatSession } from '@google/genai';
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

export async function generatePodcast(prompt: string, file: File): Promise<Dialogue> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const audioFile = await getFile(file);
    const fullPrompt = `${prompt}\n\n${JSON.stringify(DIALOGUE_SCHEMA)}`;

    try {
        const result = await model.generateContent([fullPrompt, audioFile]);
        const jsonText = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
        if (!jsonText) {
            throw new Error('Empty response from model');
        }
        return JSON.parse(jsonText) as Dialogue;
    } catch (error) {
        console.error('Error generating podcast:', error);
        throw new Error('Failed to generate podcast. Please try again.');
    }
}

export async function transcribeAudio(file: File): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const audioFile = await getFile(file);
    const prompt = 'Listen to this audio and transcribe it.';

    try {
        const result = await model.generateContent([prompt, audioFile]);
        return result.response.text();
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw new Error('Failed to transcribe audio. Please try again.');
    }
}
