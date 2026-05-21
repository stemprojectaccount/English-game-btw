import React, { useState, useEffect } from 'react';
import { Question } from '../utils/questions';
import { speakText } from '../utils/speech';
import { playCorrectSound, playIncorrectSound } from '../utils/audio';
import { CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface QuestionModalProps {
  question: Question | null;
  onAnswerComplete: (isCorrect: boolean) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({ question, onAnswerComplete }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  
  useEffect(() => {
    if (question) {
      window.speechSynthesis.cancel();
      setSelectedOption(null);
      setIsAnimating(false);
      
      const q = question as any;
      if (q.options) {
        const arr = [...q.options];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        setShuffledOptions(arr);
      } else {
        setShuffledOptions([]);
      }
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

  const renderOptions = () => {
    const q = question as any; // Type assertion
    const options: string[] = shuffledOptions.length > 0 ? shuffledOptions : (q.options || []);

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
              <span translate="no" className="notranslate">{opt}</span>
              {isSelected && isCorrect && <CheckCircle className="w-8 h-8 text-white" />}
              {isSelected && !isCorrect && <XCircle className="w-8 h-8 text-white" />}
              {isAnimating && !isSelected && isCorrect && <CheckCircle className="w-8 h-8 text-emerald-600" />}
            </button>
          )
        })}
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
          translate="no"
          className="notranslate w-[700px] glass-modal p-12 pointer-events-auto flex flex-col gap-6 rounded-[2.5rem] relative overflow-hidden text-dynamic"
        >
            {/* Soft background glow based on question type */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[80px] opacity-30 pointer-events-none bg-blue-300`}></div>

            <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3 glass-panel rounded-full px-4 py-1.5 backdrop-blur-md">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-dynamic-muted">Question</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></div>
                   <span className="text-xs font-bold uppercase tracking-widest text-dynamic-secondary">{question.type}</span>
                </div>
            </div>

            <div className="relative z-10 mt-2">
                <h2 className="text-5xl font-display font-black leading-tight tracking-tight uppercase drop-shadow-sm text-dynamic">
                  Translate <span translate="no" className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 notranslate">{(question as any).word}</span>
                </h2>
            </div>

            <div className="relative z-10">
               {renderOptions()}
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


