export type QuestionType = 'translate' | 'reorder' | 'complete';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  textToRead: string; // The English text to be spoken
  difficulty: Difficulty;
}

export interface TranslateQuestion extends BaseQuestion {
  type: 'translate';
  word: string;
  options: string[];
  answer: string;
}

export interface ReorderQuestion extends BaseQuestion {
  type: 'reorder';
  words: string[]; // Scrambled words
  answer: string; // Ordered sentence
}

export interface CompleteQuestion extends BaseQuestion {
  type: 'complete';
  sentenceWithBlank: string;
  options: string[];
  answer: string;
}

export type Question = TranslateQuestion | ReorderQuestion | CompleteQuestion;

export const questions: Question[] = [
  // --- EASY (Vocabulary and simple grammar) ---
  { id: 't1_e', difficulty: 'easy', type: 'translate', word: 'Environment', options: ['Môi trường', 'Kinh tế', 'Xã hội'], answer: 'Môi trường', textToRead: 'Environment' },
  { id: 't2_e', difficulty: 'easy', type: 'translate', word: 'School', options: ['Trường học', 'Bệnh viện', 'Công viên'], answer: 'Trường học', textToRead: 'School' },
  { id: 't3_e', difficulty: 'easy', type: 'translate', word: 'Happy', options: ['Vui vẻ', 'Buồn bã', 'Tức giận'], answer: 'Vui vẻ', textToRead: 'Happy' },
  { id: 'c1_e', difficulty: 'easy', type: 'complete', sentenceWithBlank: 'They ___ playing football now.', options: ['are', 'is', 'am'], answer: 'are', textToRead: 'They are playing football now.' },
  { id: 'c2_e', difficulty: 'easy', type: 'complete', sentenceWithBlank: 'I ___ an apple yesterday.', options: ['ate', 'eat', 'eaten'], answer: 'ate', textToRead: 'I ate an apple yesterday.' },
  
  // --- MEDIUM (Intermediate vocabulary and grammar) ---
  { id: 't1_m', difficulty: 'medium', type: 'translate', word: 'Deforestation', options: ['Sự tàn phá rừng', 'Sự ô nhiễm nước', 'Sự tuyệt chủng'], answer: 'Sự tàn phá rừng', textToRead: 'Deforestation' },
  { id: 't2_m', difficulty: 'medium', type: 'translate', word: 'Fascinating', options: ['Cực kỳ thú vị', 'Rất tẻ nhạt', 'Đáng sợ'], answer: 'Cực kỳ thú vị', textToRead: 'Fascinating' },
  { id: 't3_m', difficulty: 'medium', type: 'translate', word: 'Sustainable', options: ['Bền vững', 'Tạm thời', 'Vô ích'], answer: 'Bền vững', textToRead: 'Sustainable' },
  { id: 'r1_m', difficulty: 'medium', type: 'reorder', words: ['been', 'learning', 'I', 'have', 'for', 'years', 'English', 'five'], answer: 'I have been learning English for five years', textToRead: 'I have been learning English for five years' },
  { id: 'r2_m', difficulty: 'medium', type: 'reorder', words: ['told', 'She', 'me', 'that', 'she', 'was', 'tired'], answer: 'She told me that she was tired', textToRead: 'She told me that she was tired' },
  { id: 'c1_m', difficulty: 'medium', type: 'complete', sentenceWithBlank: 'She asked me what I ___ doing at that time.', options: ['was', 'am', 'were'], answer: 'was', textToRead: 'She asked me what I was doing at that time.' },
  { id: 'c2_m', difficulty: 'medium', type: 'complete', sentenceWithBlank: 'The letter ___ by my sister yesterday.', options: ['was written', 'wrote', 'is written'], answer: 'was written', textToRead: 'The letter was written by my sister yesterday.' },
  
  // --- HARD (Advanced grammar, phrasal verbs) ---
  { id: 't1_h', difficulty: 'hard', type: 'translate', word: 'Procrastinate', options: ['Trì hoãn', 'Thúc đẩy', 'Tiên đoán'], answer: 'Trì hoãn', textToRead: 'Procrastinate' },
  { id: 't2_h', difficulty: 'hard', type: 'translate', word: 'Meticulous', options: ['Tỉ mỉ, cẩn thận', 'Bừa bãi', 'Nhanh nhẹn'], answer: 'Tỉ mỉ, cẩn thận', textToRead: 'Meticulous' },
  { id: 'r1_h', difficulty: 'hard', type: 'reorder', words: ['would', 'buy', 'I', 'a', 'I', 'car', 'if', 'rich', 'were'], answer: 'I would buy a car if I were rich', textToRead: 'I would buy a car if I were rich' },
  { id: 'r2_h', difficulty: 'hard', type: 'reorder', words: ['man', 'The', 'who', 'lives', 'door', 'next', 'is', 'friendly', 'very'], answer: 'The man who lives next door is very friendly', textToRead: 'The man who lives next door is very friendly' },
  { id: 'c1_h', difficulty: 'hard', type: 'complete', sentenceWithBlank: 'By the time you arrived, the train ___.', options: ['had left', 'left', 'has left'], answer: 'had left', textToRead: 'By the time you arrived, the train had left.' },
  { id: 'c2_h', difficulty: 'hard', type: 'complete', sentenceWithBlank: 'Despite ___ heavily, we still went to school.', options: ['raining', 'rain', 'it rained'], answer: 'raining', textToRead: 'Despite raining heavily, we still went to school.' },
  
  // --- IMPOSSIBLE (Very advanced, idioms, rare words) ---
  { id: 't1_i', difficulty: 'impossible', type: 'translate', word: 'Ephemeral', options: ['Phù du, chóng vánh', 'Vĩnh cửu', 'Khổng lồ'], answer: 'Phù du, chóng vánh', textToRead: 'Ephemeral' },
  { id: 't2_i', difficulty: 'impossible', type: 'translate', word: 'Ubiquitous', options: ['Có mặt ở khắp nơi', 'Hiếm có', 'Độc nhất'], answer: 'Có mặt ở khắp nơi', textToRead: 'Ubiquitous' },
  { id: 't3_i', difficulty: 'impossible', type: 'translate', word: 'Serendipity', options: ['Sự tình cờ may mắn', 'Sự xui xẻo', 'Sự chuẩn bị kỹ'], answer: 'Sự tình cờ may mắn', textToRead: 'Serendipity' },
  { id: 'r1_i', difficulty: 'impossible', type: 'reorder', words: ['he', 'Hardly', 'had', 'when', 'began', 'out', 'stepped', 'it', 'to', 'rain'], answer: 'Hardly had he stepped out when it began to rain', textToRead: 'Hardly had he stepped out when it began to rain' },
  { id: 'c1_i', difficulty: 'impossible', type: 'complete', sentenceWithBlank: 'Not until he was 30 ___ to learn English.', options: ['did he begin', 'he began', 'had he begun'], answer: 'did he begin', textToRead: 'Not until he was 30 did he begin to learn English.' },
  { id: 'c2_i', difficulty: 'impossible', type: 'complete', sentenceWithBlank: 'It is essential that she ___ the meeting.', options: ['attend', 'attends', 'attended'], answer: 'attend', textToRead: 'It is essential that she attend the meeting.' }
];

export function getRandomQuestion(difficulty: Difficulty = 'medium', ignoreIds: Set<string> = new Set()): Question {
  let filtered = questions.filter(q => q.difficulty === difficulty && !ignoreIds.has(q.id));
  
  if (filtered.length === 0) {
      // Fallback: if all questions of this difficulty are used, reset the filter for this difficulty
      filtered = questions.filter(q => q.difficulty === difficulty);
      if (filtered.length === 0) {
          const randomIndex = Math.floor(Math.random() * questions.length);
          return questions[randomIndex];
      }
  }

  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}
