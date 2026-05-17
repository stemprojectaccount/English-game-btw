export type QuestionType = 'translate';
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

export type Question = TranslateQuestion;

export const questions: Question[] = [
  // --- EASY (Vocabulary and simple grammar) ---
  { id: 't1_e', difficulty: 'easy', type: 'translate', word: 'Environment', options: ['Môi trường', 'Kinh tế', 'Xã hội'], answer: 'Môi trường', textToRead: 'Environment' },
  { id: 't2_e', difficulty: 'easy', type: 'translate', word: 'School', options: ['Trường học', 'Bệnh viện', 'Công viên'], answer: 'Trường học', textToRead: 'School' },
  { id: 't3_e', difficulty: 'easy', type: 'translate', word: 'Happy', options: ['Vui vẻ', 'Buồn bã', 'Tức giận'], answer: 'Vui vẻ', textToRead: 'Happy' },
  { id: 't4_e', difficulty: 'easy', type: 'translate', word: 'Apple', options: ['Quả táo', 'Quả chuối', 'Quả cam'], answer: 'Quả táo', textToRead: 'Apple' },
  { id: 't5_e', difficulty: 'easy', type: 'translate', word: 'Cat', options: ['Con mèo', 'Con chó', 'Con chuột'], answer: 'Con mèo', textToRead: 'Cat' },
  
  // --- MEDIUM (Intermediate vocabulary and grammar) ---
  { id: 't1_m', difficulty: 'medium', type: 'translate', word: 'Deforestation', options: ['Sự tàn phá rừng', 'Sự ô nhiễm nước', 'Sự tuyệt chủng'], answer: 'Sự tàn phá rừng', textToRead: 'Deforestation' },
  { id: 't2_m', difficulty: 'medium', type: 'translate', word: 'Fascinating', options: ['Cực kỳ thú vị', 'Rất tẻ nhạt', 'Đáng sợ'], answer: 'Cực kỳ thú vị', textToRead: 'Fascinating' },
  { id: 't3_m', difficulty: 'medium', type: 'translate', word: 'Sustainable', options: ['Bền vững', 'Tạm thời', 'Vô ích'], answer: 'Bền vững', textToRead: 'Sustainable' },
  { id: 't4_m', difficulty: 'medium', type: 'translate', word: 'Achievement', options: ['Thành tựu', 'Sự thất bại', 'Cố gắng'], answer: 'Thành tựu', textToRead: 'Achievement' },
  
  // --- HARD (Advanced grammar, phrasal verbs) ---
  { id: 't1_h', difficulty: 'hard', type: 'translate', word: 'Procrastinate', options: ['Trì hoãn', 'Thúc đẩy', 'Tiên đoán'], answer: 'Trì hoãn', textToRead: 'Procrastinate' },
  { id: 't2_h', difficulty: 'hard', type: 'translate', word: 'Meticulous', options: ['Tỉ mỉ, cẩn thận', 'Bừa bãi', 'Nhanh nhẹn'], answer: 'Tỉ mỉ, cẩn thận', textToRead: 'Meticulous' },
  { id: 't3_h', difficulty: 'hard', type: 'translate', word: 'Obsolete', options: ['Lỗi thời', 'Hiện đại', 'Có ích'], answer: 'Lỗi thời', textToRead: 'Obsolete' },
  
  // --- IMPOSSIBLE (Very advanced, idioms, rare words) ---
  { id: 't1_i', difficulty: 'impossible', type: 'translate', word: 'Ephemeral', options: ['Phù du, chóng vánh', 'Vĩnh cửu', 'Khổng lồ'], answer: 'Phù du, chóng vánh', textToRead: 'Ephemeral' },
  { id: 't2_i', difficulty: 'impossible', type: 'translate', word: 'Ubiquitous', options: ['Có mặt ở khắp nơi', 'Hiếm có', 'Độc nhất'], answer: 'Có mặt ở khắp nơi', textToRead: 'Ubiquitous' },
  { id: 't3_i', difficulty: 'impossible', type: 'translate', word: 'Serendipity', options: ['Sự tình cờ may mắn', 'Sự xui xẻo', 'Sự chuẩn bị kỹ'], answer: 'Sự tình cờ may mắn', textToRead: 'Serendipity' }
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
