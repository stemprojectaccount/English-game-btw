import React, { useState, useEffect } from 'react';
import { Question } from '../utils/questions';
import { speakText } from '../utils/speech';
import { playCorrectSound, playIncorrectSound } from '../utils/audio';
import { Volume2, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface QuestionModalProps {
  question: Question | null;
  onAnswerComplete: (isCorrect: boolean) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({ question, onAnswerComplete }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (question) {
      window.speechSynthesis.cancel();
      setSelectedOption(null);
      setOrderedWords([]);
      setIsAnimating(false);
    }
  }, [question]);

  if (!question) return null;

  const handleValidation = (isCorrect: boolean) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    speakText(question.textToRead);
    
    if (isCorrect) {
       playCorrectSound();
       confetti({
         particleCount: 100,
         spread: 70,
         origin: { y: 0.6 }
       });
    } else {
       playIncorrectSound();
    }

    setTimeout(() => {
       onAnswerComplete(isCorrect);
    }, 1500);
  };

  const renderTranslateOrComplete = () => {
    const q = question as any; // Type assertion for brevity since we check type
    const options: string[] = q.options;

    return (
      <div className="flex flex-col gap-4 mt-6">
        {options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isCorrect = q.answer === opt;
          
          let btnClass = "px-6 py-4 bg-slate-100 border-2 border-black font-bold text-2xl hover:bg-yellow-300";
          if (isSelected) {
            btnClass = isCorrect 
                ? "px-6 py-4 bg-lime-400 border-2 border-black font-bold text-2xl shadow-[6px_6px_0px_#000]" 
                : "px-6 py-4 bg-red-400 border-2 border-black font-bold text-2xl shadow-[6px_6px_0px_#000]";
          } else if (isAnimating && isCorrect) {
             btnClass = "px-6 py-4 bg-lime-400 border-2 border-black font-bold text-2xl shadow-[6px_6px_0px_#000]"; // Reveal correct answer
          }

          return (
            <button
              key={idx}
              disabled={isAnimating}
              onClick={() => {
                setSelectedOption(opt);
                handleValidation(opt === q.answer);
              }}
              className={`transition-colors flex items-center justify-between text-left cursor-pointer ${btnClass} ${isAnimating && !isSelected && !isCorrect ? 'opacity-50' : ''}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    );
  };

  const renderReorder = () => {
    const q = question as any;
    const availableWords = q.words.filter((w: string) => !orderedWords.includes(w));

    return (
      <div className="flex flex-col gap-6 mt-6">
        <div className="border-b-4 border-dashed border-slate-300 py-6 min-h-[120px] flex flex-wrap items-center gap-4">
            {orderedWords.length === 0 && <span className="text-3xl font-black text-slate-400 italic">Drag words here...</span>}
            {orderedWords.map((w, idx) => (
                <button 
                  key={`ord-${idx}`} 
                  onClick={() => !isAnimating && setOrderedWords(prev => prev.filter((_, i) => i !== idx))}
                  className="px-6 py-4 bg-yellow-300 border-2 border-black font-bold text-2xl cursor-pointer"
                >
                    {w}
                </button>
            ))}
        </div>

        <div className="flex flex-wrap gap-4">
             {availableWords.map((w: string, idx: number) => (
                <button
                  key={`avail-${idx}`} 
                  disabled={isAnimating}
                  onClick={() => setOrderedWords([...orderedWords, w])}
                  className="px-6 py-4 bg-slate-100 border-2 border-black font-bold text-2xl cursor-pointer hover:bg-yellow-300"
                >
                    {w}
                </button>
            ))}
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button 
            disabled={orderedWords.length !== q.words.length || isAnimating}
            onClick={() => {
              const currentSentence = orderedWords.join(' ');
              const isCorrect = currentSentence === q.answer;
              handleValidation(isCorrect);
            }}
            className="px-12 py-3 bg-blue-600 text-white font-black uppercase text-sm tracking-widest shadow-[6px_6px_0px_#000] hover:translate-y-1 hover:shadow-[2px_2px_0px_#000] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-none"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-[700px] bg-white text-black p-12 shadow-[20px_20px_0px_#3b82f6] pointer-events-auto flex flex-col gap-6"
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 bg-black text-white px-4 py-1">
                <span className="text-xs font-bold uppercase tracking-widest">Question</span>
                <div className="w-2 h-2 bg-blue-500"></div>
                <span className="text-xs font-bold uppercase tracking-widest">{question.type}</span>
                </div>
            </div>

            <div>
               {question.type === 'translate' && (
                  <h2 className="text-6xl font-black leading-[0.9] tracking-tighter uppercase">
                    Translate <span className="text-blue-600">{(question as any).word}</span>
                  </h2>
               )}
               {question.type === 'complete' && (
                  <h2 className="text-4xl font-black leading-[0.9] tracking-tighter uppercase">
                    {(question as any).sentenceWithBlank}
                  </h2>
               )}
               {question.type === 'reorder' && (
                  <h2 className="text-5xl font-black leading-[0.9] tracking-tighter uppercase">
                    Rearrange the <span className="text-blue-600">words</span>
                  </h2>
               )}
            </div>

            {question.type === 'reorder' ? renderReorder() : renderTranslateOrComplete()}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
