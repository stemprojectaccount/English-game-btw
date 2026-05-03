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
         particleCount: 150,
         spread: 80,
         origin: { y: 0.5 },
         colors: ['#60a5fa', '#c084fc', '#f472b6', '#34d399']
       });
    } else {
       playIncorrectSound();
    }

    setTimeout(() => {
       onAnswerComplete(isCorrect);
    }, 1500);
  };

  const renderTranslateOrComplete = () => {
    const q = question as any; // Type assertion
    const options: string[] = q.options;

    return (
      <div className="flex flex-col gap-4 mt-8">
        {options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isCorrect = q.answer === opt;
          
          let btnClass = "px-6 py-5 rounded-2xl glass-panel font-medium text-2xl hover:scale-[1.02] text-dynamic transition-all";
          if (isSelected) {
            btnClass = isCorrect 
                ? "px-6 py-5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 border-2 border-emerald-400 font-bold text-2xl shadow-[0_10px_20px_rgba(52,211,153,0.3)] text-white" 
                : "px-6 py-5 rounded-2xl bg-gradient-to-r from-rose-400 to-rose-500 border-2 border-rose-400 font-bold text-2xl shadow-[0_10px_20px_rgba(244,63,94,0.3)] text-white";
          } else if (isAnimating && isCorrect) {
             // Reveal correct answer if wrong one was picked
             btnClass = "px-6 py-5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-300 dark:border-emerald-700 font-bold text-2xl text-emerald-700 dark:text-emerald-400";
          }

          return (
            <button
              key={idx}
              disabled={isAnimating}
              onClick={() => {
                setSelectedOption(opt);
                handleValidation(opt === q.answer);
              }}
              className={`transition-all duration-300 flex items-center justify-between text-left cursor-pointer ${btnClass} ${isAnimating && !isSelected && !isCorrect ? 'opacity-30 scale-95 origin-left' : ''}`}
            >
              {opt}
              {isSelected && isCorrect && <CheckCircle className="w-8 h-8 text-white" />}
              {isSelected && !isCorrect && <XCircle className="w-8 h-8 text-white" />}
              {isAnimating && !isSelected && isCorrect && <CheckCircle className="w-8 h-8 text-emerald-600" />}
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
      <div className="flex flex-col gap-8 mt-6">
        <div className="glass-panel rounded-3xl p-6 min-h-[140px] flex flex-wrap items-center gap-3">
            {orderedWords.length === 0 && <span className="text-2xl font-medium text-dynamic-muted italic w-full text-center">Tap words below to build the sentence...</span>}
            {orderedWords.map((w, idx) => (
                <button 
                  key={`ord-${idx}`} 
                  onClick={() => !isAnimating && setOrderedWords(prev => prev.filter((_, i) => i !== idx))}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 border border-purple-400 shadow-[0_8px_15px_rgba(168,85,247,0.3)] font-bold text-xl cursor-pointer hover:scale-105 transition-transform text-white"
                >
                    {w}
                </button>
            ))}
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
             {availableWords.map((w: string, idx: number) => (
                <button
                  key={`avail-${idx}`} 
                  disabled={isAnimating}
                  onClick={() => setOrderedWords([...orderedWords, w])}
                  className="px-6 py-3 rounded-full btn-secondary font-medium text-xl cursor-pointer"
                >
                    {w}
                </button>
            ))}
        </div>

        <div className="flex justify-end gap-4 mt-2">
          <button 
            disabled={orderedWords.length !== q.words.length || isAnimating}
            onClick={() => {
              const currentSentence = orderedWords.join(' ');
              const isCorrect = currentSentence === q.answer;
              handleValidation(isCorrect);
            }}
            className="btn-primary px-10 py-4 rounded-full font-bold uppercase text-sm tracking-[0.2em] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            Confirm Answer
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dynamic-overlay backdrop-blur-xl pointer-events-none"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-[700px] glass-modal p-12 pointer-events-auto flex flex-col gap-6 rounded-[2.5rem] relative overflow-hidden text-dynamic"
        >
            {/* Soft background glow based on question type */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[80px] opacity-30 pointer-events-none ${
              question.type === 'translate' ? 'bg-blue-300' :
              question.type === 'complete' ? 'bg-purple-300' : 'bg-pink-300'
            }`}></div>

            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3 glass-panel rounded-full px-4 py-1.5 backdrop-blur-md">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-dynamic-muted">Question</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></div>
                   <span className="text-xs font-bold uppercase tracking-widest text-dynamic-secondary">{question.type}</span>
                </div>
            </div>

            <div className="relative z-10 mt-2">
               {question.type === 'translate' && (
                  <h2 className="text-5xl font-display font-black leading-tight tracking-tight uppercase drop-shadow-sm text-dynamic">
                    Translate <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">{(question as any).word}</span>
                  </h2>
               )}
               {question.type === 'complete' && (
                  <h2 className="text-4xl font-display font-bold leading-snug tracking-tight text-dynamic drop-shadow-sm">
                    {(question as any).sentenceWithBlank}
                  </h2>
               )}
               {question.type === 'reorder' && (
                  <h2 className="text-4xl font-display font-black leading-tight tracking-tight uppercase drop-shadow-sm text-dynamic">
                    Rearrange the <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">words</span>
                  </h2>
               )}
            </div>

            <div className="relative z-10">
               {question.type === 'reorder' ? renderReorder() : renderTranslateOrComplete()}
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

