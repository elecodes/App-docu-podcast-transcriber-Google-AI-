
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generatePodcast, transcribeAudio } from './geminiService';
import { GoogleGenAI } from '@google/genai';

// Mock the entire @google/genai library
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  const mockGoogleGenAI = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));

  return {
    GoogleGenAI: mockGoogleGenAI,
    __private_mocks__: {
      mockGenerateContent,
      mockGetGenerativeModel,
      mockGoogleGenAI,
    },
  };
});

// FileReader mock
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: () => void = () => {};
  onerror: (error: any) => void = () => {};

  readAsDataURL(file: File) {
    if (file.name === 'error.txt') {
      const error = new Error('FileReader error');
      this.onerror(error);
    } else {
      this.result = `data:${file.type};base64,c29tZV9kYXRh`; // "some_data" in base64
      this.onload();
    }
  }
}

global.FileReader = MockFileReader as any;

describe('geminiService', () => {
  const { __private_mocks__: mocks } = vi.requireActual('@google/genai');
  const { mockGenerateContent } = mocks;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePodcast', () => {
    it('should generate a podcast from a prompt and file', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify([{ speaker: 'Alex', line: 'Hello' }]),
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = 'Test prompt';
      const file = new File([''], 'test.mp3', { type: 'audio/mp3' });
      const result = await generatePodcast(prompt, file);

      expect(result).toEqual([{ speaker: 'Alex', line: 'Hello' }]);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the model returns an empty response', async () => {
      const mockResponse = {
        response: {
          text: () => '',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = 'Test prompt';
      const file = new File([''], 'test.mp3', { type: 'audio/mp3' });

      await expect(generatePodcast(prompt, file)).rejects.toThrow('Failed to generate podcast. Please try again.');
    });
  });

  describe('transcribeAudio', () => {
    it('should transcribe an audio file', async () => {
      const mockResponse = {
        response: {
          text: () => 'This is a transcription.',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const file = new File([''], 'test.mp3', { type: 'audio/mp3' });
      const result = await transcribeAudio(file);

      expect(result).toBe('This is a transcription.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if transcription fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Transcription failed'));

      const file = new File([''], 'test.mp3', { type: 'audio/mp3' });

      await expect(transcribeAudio(file)).rejects.toThrow('Failed to transcribe audio. Please try again.');
    });
  });
});
