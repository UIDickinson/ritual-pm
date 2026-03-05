import { GoogleGenAI } from '@google/genai';

let ai = null;

function getClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

/**
 * Generate structured JSON from a prompt using Gemini.
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - The user/topic data prompt
 * @param {object} options - { temperature, maxTokens }
 * @returns {object} Parsed JSON response
 */
export async function generateJSON(systemPrompt, userPrompt, options = {}) {
  const client = getClient();
  const { temperature = 0.7, maxTokens = 1024 } = options;

  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text.trim();
  return JSON.parse(text);
}

/**
 * Simple text completion (non-JSON).
 */
export async function generateText(systemPrompt, userPrompt, options = {}) {
  const client = getClient();
  const { temperature = 0.5, maxTokens = 512 } = options;

  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  return response.text.trim();
}
