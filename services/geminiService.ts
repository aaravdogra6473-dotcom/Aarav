
import { GoogleGenAI } from "@google/genai";
import { ProcessMode } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getPrompt = (mode: ProcessMode, text: string): string => {
    switch (mode) {
        case ProcessMode.SUMMARIZE:
            return `Generate a concise summary of the following text. The summary should capture the main ideas and be significantly shorter than the original text:\n\n---\n${text}\n---`;
        case ProcessMode.KEY_POINTS:
            return `Extract the key points from the following text and present them as a clear, scannable bulleted list. Each bullet point should represent a distinct, important idea:\n\n---\n${text}\n---`;
        case ProcessMode.SIMPLIFY:
            return `Simplify the following text. Rephrase complex sentences, explain difficult words, and break down complicated concepts to make the content easy for a general audience to understand:\n\n---\n${text}\n---`;
        default:
            throw new Error('Invalid process mode');
    }
};

export const processTextWithGemini = async (text: string, mode: ProcessMode): Promise<string> => {
    try {
        const prompt = getPrompt(mode, text);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const resultText = response.text;
        if (!resultText) {
            throw new Error("Received an empty response from the AI.");
        }
        return resultText.trim();
    } catch (error) {
        console.error("Error processing text with Gemini:", error);
        if (error instanceof Error) {
            return `An error occurred: ${error.message}`;
        }
        return "An unknown error occurred while contacting the AI.";
    }
};
