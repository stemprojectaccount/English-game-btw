import { GoogleGenAI } from '@google/genai';
import { Question, Difficulty } from './questions';

let ai: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI | null {
  if (!ai) {
    // Check if key is available in either process.env or import.meta.env
    // AI Studio uses environment variables injected via vite define for process.env.GEMINI_API_KEY
    // Vercel might use VITE_GEMINI_API_KEY or just GEMINI_API_KEY if passed correctly
    const key = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) 
                 || (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);
    
    if (key && typeof key === 'string' && key.trim() !== '') {
      ai = new GoogleGenAI({ apiKey: key });
    }
  }
  return ai;
}

export async function generateQuestion(difficulty: Difficulty): Promise<Question | null> {
  const aiClient = getAiClient();
  if (!aiClient) return null;

  const difficultyPrompt = {
    'easy': 'simple vocabulary (colors, animals, daily items) and basic grammar (present simple).',
    'medium': 'intermediate vocabulary and grammar (past tense, continuous tenses, common phrases).',
    'hard': 'advanced vocabulary, complex grammar (perfect tenses, conditionals), and phrasal verbs.',
    'impossible': 'very advanced vocabulary, idioms, subjunctive mood, and rare words.'
  }[difficulty];

  const prompt = `Generate a single English to Vietnamese vocabulary translation question. 
Difficulty: ${difficulty} (${difficultyPrompt})

You must return a valid JSON object matching exactly this structure:

{
  "type": "translate",
  "word": "Apple",
  "options": ["Quả táo", "Quả chuối", "Quả cam"],
  "answer": "Quả táo",
  "textToRead": "Apple"
}

The word must be in English. The options and answer MUST be in Vietnamese.
ONLY return the JSON object, absolutely no markdown formatting, no \`\`\`json blocks. Return raw JSON.`;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      }
    });

    const text = response.text();
    if (!text) return null;
    
    const parsedData = JSON.parse(text);
    
    // Validate basic structure
    if (parsedData && parsedData.type === 'translate') {
       return {
        ...parsedData,
        id: 'gen_' + Date.now() + Math.random().toString(36).substring(7),
        difficulty
       } as Question;
    }
    return null;
  } catch (error) {
    console.error("Error generating question from Gemini:", error);
    return null;
  }
}
