import { GoogleGenAI } from '@google/genai';
import { Question, Difficulty } from './questions';

let ai: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI | null {
  if (!ai) {
    // Check if key is available in either process.env or import.meta.env
    // AI Studio uses environment variables injected via vite define for process.env.GEMINI_API_KEY
    // Vercel might use VITE_GEMINI_API_KEY or just GEMINI_API_KEY if passed correctly
    const hardcodedFallback = 'AIzaSyAi7YqUWgRsNMRHKzJZ1trLrTJe1nDdLCo';
    const key = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) 
                 || (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || hardcodedFallback;
    
    if (key && typeof key === 'string' && key.trim() !== '') {
      ai = new GoogleGenAI({ apiKey: key });
    }
  }
  return ai;
}

export async function generateQuestion(difficulty: Difficulty, usedWords: string[] = []): Promise<Question | null> {
  const aiClient = getAiClient();
  if (!aiClient) return null;

  const difficultyPrompt = {
    'easy': 'simple vocabulary (colors, animals, daily items) and basic grammar (present simple).',
    'medium': 'intermediate vocabulary and grammar (past tense, continuous tenses, common phrases).',
    'hard': 'advanced vocabulary, complex grammar (perfect tenses, conditionals), and phrasal verbs.',
    'impossible': 'very advanced vocabulary, idioms, subjunctive mood, and rare words.'
  }[difficulty];

  const excludePrompt = usedWords.length > 0 
    ? `\nIMPORTANT: Do NOT generate any of the following words: ${usedWords.join(', ')}` 
    : '';

  const topics = [
    'science', 'art', 'nature', 'technology', 'daily life', 'advanced literature', 
    'history', 'sports', 'food', 'travel', 'health', 'business', 'music', 
    'psychology', 'oceans', 'space', 'politics', 'movies', 'relationships', 
    'animals', 'weather', 'geography', 'professions', 'emotions', 'architecture', 'mythology'
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  const randomSeedForGemini = Math.floor(Math.random() * 1000000);

  const prompt = `Generate a single English to Vietnamese vocabulary translation question. 
Difficulty: ${difficulty} (${difficultyPrompt})${excludePrompt}

IMPORTANT: Random Seed is ${randomSeedForGemini}. You MUST generate a COMPLETELY NEW word that you have not generated recently.
IMPORTANT FOCUS: Contextualize the vocabulary specifically around this topic: ${randomTopic.toUpperCase()}. 
Ensure the word is HIGHLY DIVERSE, creative, and strictly avoids common, beginner words and overused examples. 
You MUST provide exactly 4 options. 
CRITICAL: The position of the correct answer in the "options" array MUST be randomized every single time! It must NOT always be the first option!

You must return a valid JSON object matching exactly this structure:

{
  "type": "translate",
  "word": "Apple",
  "options": ["Quả mận", "Quả chuối", "Quả táo", "Quả cam"],
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
        temperature: 0.95,
        topP: 0.95,
        topK: 64,
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
