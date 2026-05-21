import React, { useRef, useEffect, useState, useCallback } from 'react';
import { initializeHandTracker } from '../utils/handTracker';
import { getRandomQuestion, Question, Difficulty } from '../utils/questions';
import { playPopSound, playStartSound, playEndSound } from '../utils/audio';
import { QuestionModal } from './QuestionModal';
import { Trophy, Timer, Play, Palette, Sun, Moon, Leaf, Droplet, Sunset, Zap, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

const THEME_EMOJIS = {
  light: ['✨', '🌟', '☁️', '🎈', '☀️', '🕊️'],
  dark: ['🌙', '🦇', '👾', '🌌', '💎', '🔮'],
  nature: ['🍃', '🌸', '🦋', '🍀', '🌻', '🐞'],
  ocean: ['🫧', '🐠', '🌊', '🐬', '🐚', '🦈'],
  sunset: ['🌇', '🌅', '🍹', '🌴', '🌺', '☀️'],
  neon: ['⚡', '🎸', '🕹️', '🕺', '🚀', '💎'],
  galaxy: ['⭐', '🚀', '🛸', '☄️', '🪐', '👽']
};

const FloatingEmojis: React.FC<{ theme: string }> = ({ theme }) => {
  const [emojis, setEmojis] = useState<{id: number, char: string, left: number, delay: number, duration: number, size: number}[]>([]);

  useEffect(() => {
    // Spawn a new emoji every few seconds
    const interval = setInterval(() => {
      setEmojis(prev => {
        const available = THEME_EMOJIS[theme as keyof typeof THEME_EMOJIS] || THEME_EMOJIS.light;
        const char = available[Math.floor(Math.random() * available.length)];
        const newEmoji = {
          id: Date.now() + Math.random(),
          char,
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 15 + Math.random() * 15,
          size: 0.5 + Math.random() * 1
        };
        return [...prev.slice(-15), newEmoji]; // Keep max 15 emojis at a time to prevent performance issues
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [theme]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <AnimatePresence>
        {emojis.map((emoji) => (
          <motion.div
            key={emoji.id}
            initial={{ y: '100vh', opacity: 0, x: `${emoji.left}vw`, scale: 0.5 }}
            animate={{ 
              y: '-10vh', 
              opacity: [0, 1, 1, 0],
              x: [`${emoji.left}vw`, `${emoji.left + (Math.random() * 10 - 5)}vw`, `${emoji.left - (Math.random() * 10 - 5)}vw`],
              scale: emoji.size
            }}
            transition={{ 
              duration: emoji.duration, 
              ease: "linear",
              delay: emoji.delay,
              times: [0, 0.2, 0.8, 1]
            }}
            className="absolute text-4xl drop-shadow-lg"
          >
            {emoji.char}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

interface Ball {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: string;
  active: boolean;
  drift?: number;
  swingPhase?: number;
}

type GameState = 'START' | 'PLAYING' | 'POPPING' | 'QUESTION' | 'END' | 'TUTORIAL' | 'GAMEOVER';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;
}

const getDifficultySettings = (diff: Difficulty) => {
    switch (diff) {
        case 'easy': return { duration: 600, multiplier: 0.5, spawnRate: 5000, maxBalloons: 5, fallTime: 10 };
        case 'medium': return { duration: 300, multiplier: 1, spawnRate: 4000, maxBalloons: 5, fallTime: 8 };
        case 'hard': return { duration: 180, multiplier: 2, spawnRate: 2000, maxBalloons: 7, fallTime: 6 };
        case 'impossible': return { duration: 60, multiplier: 3, spawnRate: 1000, maxBalloons: 10, fallTime: 4 };
        default: return { duration: 300, multiplier: 1, spawnRate: 4000, maxBalloons: 5, fallTime: 8 };
    }
};

export const HandTrackerGame: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeLeft, setTimeLeft] = useState(getDifficultySettings('medium').duration);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Tutorial States
  const [isTutorial, setIsTutorial] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light'|'dark'|'nature'|'ocean'|'sunset'|'neon'|'galaxy'>('light');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  useEffect(() => {
    if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }, [currentTheme]);
  const [tutorialPhase, setTutorialPhase] = useState<'HAND' | 'BALLOON' | 'QUESTION' | 'DONE'>('HAND');
  const tutorialHandDetected = useRef(false);

  const [theme, setTheme] = useState<'light' | 'dark' | 'nature'>('light');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastBallTime = useRef<number>(0);

  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  const usedWordsRef = useRef<Set<string>>(new Set());

  // Initialize camera and tracker
  useEffect(() => {
    let stream: MediaStream | null = null;
    const init = async () => {
        try {
            await initializeHandTracker();
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: "user" }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.warn('Video play prevented:', e));
                    };
                }
            } else {
                setCameraError("Camera API is not supported in this environment. Please try opening in a new tab.");
            }
        } catch (error: any) {
            console.error("Error accessing camera or initializing ML:", error);
            const errStr = String(error);
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError" || errStr.includes("Permission denied") || errStr.includes("NotAllowedError")) {
                 setCameraError("Camera permission denied. Please allow camera access in your browser, or open the app in a new tab if you are viewing this in an iframe.");
            } else {
                 setCameraError(`Camera Error: ${error.message || errStr}. Try opening in a new tab.`);
            }
        }
    };
    init();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  // Timer logic
  useEffect(() => {
     let timerInterval: NodeJS.Timeout;
     if (gameState === 'PLAYING' && timeLeft > 0) {
        timerInterval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    playEndSound();
                    setGameState('END');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
     }
     return () => clearInterval(timerInterval);
  }, [gameState, timeLeft]);

  const startGame = () => {
      playStartSound();
      setIsTutorial(false);
      setGameState('PLAYING');
      setScore(0);
      setCombo(0);
      setTimeLeft(getDifficultySettings(difficulty).duration);
      usedQuestionIdsRef.current = new Set();
      usedWordsRef.current = new Set();
      ballsRef.current = [];
  };

  const startTutorial = () => {
      setIsTutorial(true);
      setTutorialPhase('HAND');
      setGameState('TUTORIAL');
      tutorialHandDetected.current = false;
      ballsRef.current = [];
  };

  const popBall = (index: number, x: number, y: number) => {
      const ball = ballsRef.current[index];
      ball.active = false; // Mark inactive
      
      playPopSound();
      
      // Custom explosion particles
      for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 15 + 5;
          particlesRef.current.push({
              x: x,
              y: y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              decay: Math.random() * 0.02 + 0.02,
              color: Math.random() > 0.5 ? ball.color : '#ffffff',
              size: Math.random() * 12 + 4
          });
      }

      setGameState('POPPING');
      
      setTimeout(async () => {
          if (isTutorial) {
              setTutorialPhase('QUESTION');
              setGameState('QUESTION');
              setCurrentQuestion({
                  id: 'tut1',
                  difficulty: 'easy',
                  type: 'translate',
                  word: 'Welcome',
                  options: ['Chào mừng', 'Tạm biệt', 'Cảm ơn'],
                  answer: 'Chào mừng',
                  textToRead: 'Welcome'
              });
          } else {
              setGameState('QUESTION'); // Change state to show modal right away
              const { generateQuestion } = await import('../utils/geminiService');
              const usedWordsArray = Array.from(usedWordsRef.current);
              let q = await generateQuestion(difficulty, usedWordsArray);
              
              if (!q) {
                  q = getRandomQuestion(difficulty, usedQuestionIdsRef.current);
                  if (q && q.type === 'translate') {
                      usedWordsRef.current.add(q.word);
                  }
              } else if (q.type === 'translate') {
                  usedWordsRef.current.add(q.word);
              }
              usedQuestionIdsRef.current.add(q.id);
              setCurrentQuestion(q);
          }
      }, 800);
  };

  const handleAnswerComplete = (isCorrect: boolean) => {
      if (isTutorial) {
         if (!isCorrect) {
            // Re-prompt the same question if wrong
            setTimeout(() => {
                setCurrentQuestion({
                    id: 'tut1',
                    type: 'translate',
                    word: 'Welcome',
                    options: ['Chào mừng', 'Tạm biệt', 'Cảm ơn'],
                    answer: 'Chào mừng',
                    textToRead: 'Welcome'
                });
            }, 100); // Small delay to allow fade out/in effect
            setCurrentQuestion(null);
            return;
         }

         setTutorialPhase('DONE');
         setGameState('TUTORIAL');
         setCurrentQuestion(null);
         setTimeout(() => {
            setIsTutorial(false);
            setGameState('START');
         }, 3000);
         return;
      }

      if (isCorrect) {
          const newCombo = combo + 1;
          setCombo(newCombo);
          const pointsEarned = Math.floor(10 * newCombo * getDifficultySettings(difficulty).multiplier);
          setScore(prev => prev + pointsEarned);
      } else {
          setCombo(0);
      }
      setCurrentQuestion(null);
      setGameState('PLAYING');
  };

  const drawFrame = useCallback(async () => {
    if (gameState !== 'PLAYING' && gameState !== 'POPPING' && gameState !== 'TUTORIAL') {
         requestRef.current = requestAnimationFrame(drawFrame);
         return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== 4) {
       requestRef.current = requestAnimationFrame(drawFrame);
       return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas size matches video size
    if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Video rendering moved to separate CSS layer

    const handTracker = await initializeHandTracker();
    let handPointsList: {x: number, y: number}[] = [];

    try {
        const results = handTracker.detectForVideo(video, performance.now());
        if (results.landmarks && results.landmarks.length > 0) {
            for (const landmarks of results.landmarks) {
               // Get all points
               const points = landmarks.map(lm => ({
                   x: (1 - lm.x) * canvas.width,
                   y: lm.y * canvas.height
               }));

               handPointsList.push(...points);
            }
        }
    } catch (e) {
        // ignore occasional ML errors
    }

    if (isTutorial && gameState === 'TUTORIAL') {
        if (tutorialPhase === 'HAND' && (handPointsList.length > 0 || cameraError) && !tutorialHandDetected.current) {
            tutorialHandDetected.current = true;
            setTimeout(() => {
                setTutorialPhase('BALLOON');
                ballsRef.current = [{
                    id: Date.now(),
                    x: canvas.width / 2,
                    y: -150,
                    radius: 70,
                    speed: 2,
                    color: '#33FF57',
                    active: true,
                    drift: 0,
                    swingPhase: 0
                }];
            }, 2000);
        }
    }

    // Manage balloons
    const now = Date.now();
    const currentSettings = getDifficultySettings(difficulty);
    if (gameState === 'PLAYING' && now - lastBallTime.current > currentSettings.spawnRate && ballsRef.current.length < currentSettings.maxBalloons) {
        // Add new balloon
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF6', '#FFD700'];
        ballsRef.current.push({
            id: now,
            x: Math.random() * (canvas.width - 200) + 100,
            y: -150,
            radius: 40 + Math.random() * 15, // Made balls smaller
            speed: ((canvas.height + 150) / (currentSettings.fallTime * 60)) * (0.8 + Math.random() * 0.4), // Randomize speed +/- 20%
            color: colors[Math.floor(Math.random() * colors.length)],
            active: true,
            drift: (Math.random() - 0.5) * 1.5, // Slight horizontal drift
            swingPhase: Math.random() * Math.PI * 2
        });
        lastBallTime.current = now;
    }

    let poppedThisFrame = false;

    ballsRef.current.forEach((ball, i) => {
        if (!ball.active) return;
        if (gameState === 'PLAYING' || (isTutorial && tutorialPhase === 'BALLOON')) {
            ball.swingPhase = (ball.swingPhase || 0) + 0.05;
            const verticalVariation = Math.sin(ball.swingPhase) * 0.5;
            ball.y += ball.speed + verticalVariation;
            ball.x += (ball.drift || 0) + Math.cos(ball.swingPhase) * 0.5;

            // Keep balls within canvas bounds horizontally
            if (ball.x - ball.radius < 0) {
               ball.x = ball.radius;
               ball.drift = Math.abs(ball.drift || 0); // bounce right
            } else if (ball.x + ball.radius > canvas.width) {
               ball.x = canvas.width - ball.radius;
               ball.drift = -Math.abs(ball.drift || 0); // bounce left
            }
        }

        const radiusY = ball.radius * 1.2;

        // Draw balloon body
        ctx.beginPath();
        ctx.ellipse(ball.x, ball.y, ball.radius, radiusY, 0, 0, 2 * Math.PI);
        ctx.fillStyle = ball.color;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'white';
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.closePath();
        
        // Draw knot
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y + radiusY);
        ctx.lineTo(ball.x - 12, ball.y + radiusY + 15);
        ctx.lineTo(ball.x + 12, ball.y + radiusY + 15);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        // Draw string
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y + radiusY + 15);
        ctx.lineTo(ball.x - 5, ball.y + radiusY + 40);
        ctx.lineTo(ball.x + 5, ball.y + radiusY + 80);
        ctx.lineTo(ball.x - 2, ball.y + radiusY + 120);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // Add "?" text in the center
        ctx.fillStyle = 'white';
        ctx.font = 'bold 45px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        ctx.fillText('?', ball.x, ball.y - 10);
        ctx.shadowBlur = 0;

        // Check collision against all hand points
        if (!poppedThisFrame && (gameState === 'PLAYING' || (isTutorial && tutorialPhase === 'BALLOON'))) {
            let isHit = false;
            for (const pt of handPointsList) {
                const dist = Math.hypot(ball.x - pt.x, ball.y - pt.y);
                if (dist < radiusY + 35) { // increased hit radius for better UX
                   isHit = true;
                   break;
                }
            }

            if (isHit) {
                popBall(i, ball.x, ball.y);
                poppedThisFrame = true;
            }
        }
    });

    // Remove off-screen or inactive balls
    let gameOverTriggered = false;
    ballsRef.current = ballsRef.current.filter(b => {
        if (!b.active) return false;
        if (b.y + b.radius * 1.2 >= canvas.height) {
            if (gameState === 'PLAYING') {
                gameOverTriggered = true;
            }
            return false;
        }
        return true;
    });

    if (gameOverTriggered && gameState === 'PLAYING') {
        setGameState('GAMEOVER');
        playEndSound();
    }

    if (isTutorial && tutorialPhase === 'BALLOON' && ballsRef.current.length === 0) {
         ballsRef.current = [{
              id: Date.now(),
              x: canvas.width / 2,
              y: -150,
              radius: 70,
              speed: 2,
              color: '#33FF57',
              active: true,
              drift: 0,
              swingPhase: 0
         }];
    }

    // Manage particles
    particlesRef.current.forEach(p => {
        if (p.life <= 0) return;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // Gravity
        p.life -= p.decay;

        if (p.life > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, 2 * Math.PI);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.closePath();
        }
    });

    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    ctx.shadowBlur = 0;

    requestRef.current = requestAnimationFrame(drawFrame);
  }, [gameState, isTutorial, tutorialPhase, difficulty]);

  useEffect(() => {
     requestRef.current = requestAnimationFrame(drawFrame);
     return () => {
         if (requestRef.current) cancelAnimationFrame(requestRef.current);
     };
  }, [drawFrame]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
      if (gameState !== 'PLAYING' && !(isTutorial && tutorialPhase === 'BALLOON')) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      let clientX = 'clientX' in e ? e.clientX : 0;
      let clientY = 'clientY' in e ? e.clientY : 0;

      // Handle touch separately if needed, but pointer events cover touch, mouse, and stylus natively usually
      
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      ballsRef.current.forEach((ball, i) => {
          if (!ball.active) return;
          const radiusY = ball.radius * 1.2;
          const dx = mouseX - ball.x;
          const dy = mouseY - ball.y;
          
          const distanceX = dx / ball.radius;
          const distanceY = dy / radiusY;
          const isHit = (distanceX * distanceX + distanceY * distanceY) <= 1;

          if (isHit) {
              popBall(i, ball.x, ball.y);
          }
      });
  };

  return (
    <div 
      className="relative w-full h-screen text-dynamic font-sans overflow-hidden select-none transition-colors duration-500 touch-none"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
    >
      
      {/* Video element for ML processing & Background */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-0" style={{ transform: 'scaleX(-1)' }} playsInline muted />
      
      {cameraError && (
        <div className="absolute top-0 left-0 w-full z-[100] bg-red-600/90 text-white p-4 text-center backdrop-blur-md font-bold shadow-lg">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
              <span>{cameraError}</span>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-4 py-2 bg-white text-red-600 rounded-full text-sm hover:scale-105 transition-transform"
              >
                 Open in New Tab
              </button>
          </div>
        </div>
      )}

      {/* Theme Switcher */}
      <div className="absolute bottom-10 left-10 z-50 pointer-events-auto">
        <div className="relative">
          <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="w-12 h-12 rounded-full glass-panel flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.1)] group relative border-2"
            title="Change Theme"
          >
            <Palette className="w-5 h-5 text-dynamic drop-shadow-sm" />
            
            {/* Soft glow behind the button */}
            <div className="absolute inset-0 rounded-full bg-dynamic-overlay blur-md -z-10 group-hover:blur-lg transition-all opacity-50"></div>
          </button>

          {showThemeMenu && (
            <div className="absolute bottom-16 left-0 glass-modal rounded-3xl p-3 flex flex-col gap-1 min-w-[180px] animate-in slide-in-from-bottom-2 fade-in duration-200 border-2 origin-bottom text-left">
              <button 
                onClick={() => { setCurrentTheme('light'); setShowThemeMenu(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${currentTheme === 'light' ? 'bg-black/10 dark:bg-white/10 font-bold scale-105 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'}`}
              >
                <Sun className="w-4 h-4 text-amber-500 drop-shadow-sm" />
                <span className="text-xs uppercase tracking-[0.2em] text-dynamic">Bright</span>
              </button>
              <button 
                onClick={() => { setCurrentTheme('dark'); setShowThemeMenu(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${currentTheme === 'dark' ? 'bg-black/10 dark:bg-white/10 font-bold scale-105 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'}`}
              >
                <Moon className="w-4 h-4 text-indigo-400 drop-shadow-sm" />
                <span className="text-xs uppercase tracking-[0.2em] text-dynamic">Dark</span>
              </button>
              <button 
                onClick={() => { setCurrentTheme('nature'); setShowThemeMenu(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${currentTheme === 'nature' ? 'bg-black/10 dark:bg-white/10 font-bold scale-105 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'}`}
              >
                <Leaf className="w-4 h-4 text-emerald-500 drop-shadow-sm" />
                <span className="text-xs uppercase tracking-[0.2em] text-dynamic">Nature</span>
              </button>
              <button 
                onClick={() => { setCurrentTheme('ocean'); setShowThemeMenu(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${currentTheme === 'ocean' ? 'bg-black/10 dark:bg-white/10 font-bold scale-105 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'}`}
              >
                <Droplet className="w-4 h-4 text-blue-400 drop-shadow-sm" />
                <span className="text-xs uppercase tracking-[0.2em] text-dynamic">Ocean</span>
              </button>
              <button 
                onClick={() => { setCurrentTheme('sunset'); setShowThemeMenu(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${currentTheme === 'sunset' ? 'bg-black/10 dark:bg-white/10 font-bold scale-105 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'}`}
              >
                <Sunset className="w-4 h-4 text-orange-500 drop-shadow-sm" />
                <span className="text-xs uppercase tracking-[0.2em] text-dynamic">Sunset</span>
              </button>
              <button 
                onClick={() => { setCurrentTheme('neon'); setShowThemeMenu(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${currentTheme === 'neon' ? 'bg-black/10 dark:bg-white/10 font-bold scale-105 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'}`}
              >
                <Zap className="w-4 h-4 text-pink-500 drop-shadow-sm" />
                <span className="text-xs uppercase tracking-[0.2em] text-dynamic">Neon</span>
              </button>
              <button 
                onClick={() => { setCurrentTheme('galaxy'); setShowThemeMenu(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${currentTheme === 'galaxy' ? 'bg-black/10 dark:bg-white/10 font-bold scale-105 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'}`}
              >
                <Star className="w-4 h-4 text-purple-400 drop-shadow-sm" />
                <span className="text-xs uppercase tracking-[0.2em] text-dynamic">Galaxy</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Theme Filters - Soft Vignette and Tints */}
      <div className={`absolute inset-0 z-10 transition-colors duration-1000 ${
        currentTheme === 'light' ? 'bg-gradient-to-b from-white/10 to-transparent mix-blend-overlay' :
        currentTheme === 'dark' ? 'bg-gradient-to-b from-black/40 via-transparent to-black/60 mix-blend-multiply' :
        currentTheme === 'nature' ? 'bg-gradient-to-br from-emerald-900/20 via-transparent to-green-900/30 mix-blend-overlay' :
        currentTheme === 'ocean' ? 'bg-gradient-to-t from-blue-900/30 via-transparent to-cyan-900/20 mix-blend-overlay' :
        currentTheme === 'sunset' ? 'bg-gradient-to-t from-orange-600/20 via-transparent to-rose-500/10 mix-blend-color' :
        currentTheme === 'neon' ? 'bg-gradient-to-b from-fuchsia-600/10 via-transparent to-purple-900/30 mix-blend-overlay' :
        'bg-gradient-to-b from-indigo-900/10 via-transparent to-slate-900/40 mix-blend-overlay'
      }`}></div>

      {/* Main Canvas covering the screen - Now transparent */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
      />
      
      {/* Floating Emojis based on Theme - Now above everything except UI */}
      <div className="absolute inset-0 z-30 pointer-events-none opacity-80">
        <FloatingEmojis theme={currentTheme} />
      </div>

      {/* Visual Overlay "Sparkle" Effects */}
      <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-purple-300 rounded-full shadow-[0_0_20px_10px_rgba(192,132,252,0.6)] z-0 pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-blue-300 rounded-full shadow-[0_0_25px_12px_rgba(96,165,250,0.6)] z-0 pointer-events-none animate-[pulse_3s_ease-in-out_infinite]"></div>

      {/* Top Navigation & Stats Bar */}
      <header className="absolute top-0 w-full flex flex-col z-40 pointer-events-none">
          {/* Edge Progress Bar */}
          <div className="w-full h-2 bg-slate-900/20 relative">
             <div 
               className="h-full transition-all duration-1000 ease-linear"
               style={{ 
                 width: `${(timeLeft / getDifficultySettings(difficulty).duration) * 100}%`,
                 backgroundColor: timeLeft <= 10 ? '#f43f5e' : timeLeft <= 30 ? '#fbbf24' : '#60a5fa',
                 boxShadow: `0 0 15px ${timeLeft <= 10 ? '#f43f5e' : timeLeft <= 30 ? '#fbbf24' : '#60a5fa'}`,
               }}
             />
          </div>
          
          <div className="w-full p-8 flex justify-between items-start relative">
            <div className="flex flex-col">
               <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600 mb-1">Điểm Hiện Tại</span>
               <motion.span 
                 key={score}
                 initial={{ scale: 1.5, color: '#f43f5e' }}
                 animate={{ scale: 1, color: 'transparent' }}
                 className="text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-blue-500 leading-none drop-shadow-md"
               >
                 {score}
               </motion.span>
            </div>

            <div className="flex flex-col items-center">
               <motion.div 
                 whileHover={{ scale: 1.05 }}
                 className="glass-panel rounded-[2rem] p-4 flex items-center justify-center border-2 border-white/40 shadow-xl relative overflow-hidden"
               >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90 filter drop-shadow-md">
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-black/10 dark:text-white/10"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 38}`}
                        strokeDashoffset={`${2 * Math.PI * 38 * (1 - (timeLeft / getDifficultySettings(difficulty).duration))}`}
                        className="transition-all duration-1000 ease-linear"
                        style={{
                          color: timeLeft <= 10 ? '#f43f5e' : timeLeft <= 30 ? '#fbbf24' : '#3b82f6'
                        }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={`w-2 h-2 rounded-full mb-1 animate-pulse shadow-[0_0_10px_currentColor]`}
                           style={{ backgroundColor: timeLeft <= 10 ? '#f43f5e' : timeLeft <= 30 ? '#fbbf24' : '#3b82f6', color: timeLeft <= 10 ? '#f43f5e' : timeLeft <= 30 ? '#fbbf24' : '#3b82f6' }}></div>
                      <span className="text-xl font-mono font-black tracking-tighter text-dynamic drop-shadow-sm">
                         {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
               </motion.div>
            </div>
            
            <div className={`flex flex-col items-end transition-opacity duration-300 ${combo > 1 ? 'opacity-100' : 'opacity-0'}`}>
               <span className="text-xs font-bold uppercase tracking-[0.3em] text-pink-500 mb-1 drop-shadow-sm">Chuỗi Combo</span>
               <motion.span 
                 key={combo}
                 initial={{ scale: 1.5, rotate: -10 }}
                 animate={{ scale: 1, rotate: 0 }}
                 className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-rose-400 to-pink-600 leading-none drop-shadow-lg"
               >
                 x{combo}
               </motion.span>
            </div>
          </div>
      </header>

      {/* Tutorial Overlay */}
      {isTutorial && (gameState === 'TUTORIAL' || gameState === 'POPPING' || gameState === 'QUESTION') && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center">
             {tutorialPhase === 'HAND' && (
                 <div className="glass-modal px-8 py-6 rounded-3xl animate-[bounce_2s_infinite]">
                    <h2 className="text-3xl font-display font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">{cameraError ? "Dùng chuột/ngón tay" : "Bước 1: Quét Bàn Tay"}</h2>
                    <p className="text-lg font-medium mt-2 text-dynamic-secondary">
                        {tutorialHandDetected.current || cameraError
                           ? "Tuyệt vời! Hãy chuẩn bị đập bóng." 
                           : "Hãy đưa tay lên trước camera để vẫy bóng nhé!"}
                    </p>
                 </div>
             )}
             {tutorialPhase === 'BALLOON' && (
                 <div className="glass-modal px-8 py-6 rounded-3xl animate-[bounce_2s_infinite]">
                    <h2 className="text-3xl font-display font-black uppercase text-amber-500 drop-shadow-sm">Bước 2: Đập Bóng!</h2>
                    <p className="text-lg font-medium mt-2 text-dynamic-secondary">
                       {cameraError ? "Di chuyển chuột hoặc dùng ngón tay chạm vào quả bóng đang rơi để đập vỡ nó." : "Di chuyển tay của bạn chạm vào quả bóng đang rơi để đập vỡ nó."}
                    </p>
                 </div>
             )}
             {tutorialPhase === 'DONE' && (
                 <div className="glass-modal px-8 py-6 rounded-3xl animate-[bounce_2s_infinite]">
                    <h2 className="text-4xl font-display font-black uppercase text-emerald-500 drop-shadow-sm">Hoàn Thành!</h2>
                    <p className="text-xl font-medium mt-2 text-dynamic-secondary">Bạn đã hoàn thành phần hướng dẫn.</p>
                 </div>
             )}
          </div>
      )}

      {/* Start Screen */}
      {gameState === 'START' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-dynamic-overlay backdrop-blur-xl z-40"
          >
             <motion.div 
               initial={{ scale: 0.8, y: 50, opacity: 0 }}
               animate={{ scale: 1, y: 0, opacity: 1 }}
               transition={{ type: "spring", stiffness: 200, damping: 20 }}
               className="glass-modal p-12 max-w-[800px] text-center pointer-events-auto flex flex-col gap-8 rounded-[3rem] shadow-2xl relative overflow-hidden"
             >
                 {/* Decorative background circle */}
                 <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-[80px] opacity-20"></div>
                 <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-blue-400 to-emerald-400 rounded-full blur-[80px] opacity-20"></div>

                 <div className="relative z-10">
                    <motion.div 
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-xs font-bold tracking-[0.4em] text-dynamic-muted uppercase mb-2">Made by ThanhDat7A</p>
                      <h1 className="text-7xl md:text-8xl font-display font-black leading-none tracking-tight uppercase relative inline-block">
                         <span className="text-gradient drop-shadow-md">Pop & Learn</span>
                         <motion.span 
                           animate={{ rotate: [0, 15, -10, 15, 0] }}
                           transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                           className="absolute -top-6 -right-12 text-5xl"
                         >
                           🎈
                         </motion.span>
                      </h1>
                    </motion.div>
                 </div>
                 
                 <motion.p 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.4 }}
                   className="text-dynamic-secondary font-medium text-lg md:text-xl leading-relaxed max-w-[600px] mx-auto relative z-10"
                 >
                     Di chuyển tay để đập vỡ những quả bóng đang rơi. Trả lời đúng các câu hỏi tiếng Anh để ghi điểm! 
                     Vui lòng cấp quyền truy cập camera để bắt đầu.
                 </motion.p>
                 
                 <motion.div 
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.6 }}
                   className="flex flex-col gap-3 w-full text-left p-6 rounded-[2rem] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 relative z-10"
                 >
                    <h3 className="text-sm font-bold uppercase tracking-widest text-dynamic-muted mb-1 ml-2">Độ Khó:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {[
                         { id: 'easy', label: 'Easy', time: '10 phút', desc: 'x0.5', color: 'from-blue-400 to-blue-500', emoji: '🌱' },
                         { id: 'medium', label: 'Medium', time: '5 phút', desc: 'x1', color: 'from-emerald-400 to-emerald-500', emoji: '⭐' },
                         { id: 'hard', label: 'Hard', time: '3 phút', desc: 'x2', color: 'from-amber-400 to-orange-500', emoji: '🔥' },
                         { id: 'impossible', label: 'Impossible', time: '1 phút', desc: 'x3', color: 'from-rose-500 to-rose-600', emoji: '💀' },
                       ].map(d => (
                          <motion.button
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             key={d.id}
                             onClick={() => setDifficulty(d.id as Difficulty)}
                             className={`relative overflow-hidden flex flex-col items-center justify-center py-5 px-2 rounded-2xl transition-all duration-300 ${
                                difficulty === d.id 
                                ? 'bg-white shadow-xl border-2 border-slate-200 dark:bg-transparent dark:border-white/40 text-dynamic scale-105' 
                                : 'bg-transparent border-2 border-dashed border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 text-dynamic-secondary'
                             }`}
                          >
                             {difficulty === d.id && <div className={`absolute inset-0 bg-gradient-to-br ${d.color} opacity-20 dark:opacity-40`}></div>}
                             <span className="text-2xl mb-1 relative z-10">{d.emoji}</span>
                             <span className={`text-base sm:text-lg font-display font-black uppercase relative z-10 tracking-widest ${difficulty === d.id ? 'text-dynamic drop-shadow-sm' : 'text-dynamic-secondary'}`}>{d.label}</span>
                             <span className={`text-[10px] font-bold mt-1 tracking-widest relative z-10 px-2 py-0.5 rounded-full ${difficulty === d.id ? 'bg-black/10 dark:bg-white/20 text-dynamic' : 'bg-transparent text-dynamic-muted'}`}>{d.time} | {d.desc}</span>
                          </motion.button>
                       ))}
                    </div>
                 </motion.div>

                 <motion.div 
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.8 }}
                   className="flex gap-4 justify-center mt-4 w-full relative z-10"
                 >
                     <motion.button 
                       whileHover={{ scale: 1.05, y: -2 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={startTutorial}
                       className="btn-secondary px-8 py-5 flex-1 rounded-3xl font-bold uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg"
                     >
                        Hướng Dẫn
                     </motion.button>
                     <motion.button 
                       whileHover={{ scale: 1.05, y: -2 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={startGame}
                       className="btn-primary px-10 py-5 flex-[2] rounded-3xl font-black uppercase text-base tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl"
                     >
                        Bắt Đầu Chơi
                        <Play className="w-5 h-5 fill-current" />
                     </motion.button>
                 </motion.div>
             </motion.div>
          </motion.div>
      )}

      {/* End / Game Over Screen */}
      {(gameState === 'END' || gameState === 'GAMEOVER') && (
          <div className="absolute inset-0 flex items-center justify-center bg-dynamic-overlay backdrop-blur-xl z-40">
             <div className="glass-modal p-12 max-w-2xl text-center pointer-events-auto flex flex-col gap-6 rounded-[2.5rem]">
                 <h2 className="text-6xl font-display font-black leading-none tracking-tight uppercase drop-shadow-sm mb-2">
                     {gameState === 'END' ? <>Hết <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">Giờ!</span></> : <>Thua <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">Cuộc!</span></>}
                 </h2>
                 {gameState === 'GAMEOVER' && <p className="text-lg font-medium text-rose-500">Bạn đã để bóng rơi xuống đất!</p>}
                 
                 <div className="py-8 bg-white/60 rounded-3xl border border-white shadow-sm my-2">
                    <p className="text-xs font-bold uppercase tracking-widest mb-2 text-dynamic-muted">Điểm Số Cuối Cùng</p>
                    <p className="text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-blue-500 leading-none drop-shadow-md">{score}</p>
                 </div>

                 <div className="flex gap-4 justify-center mt-4">
                     <button 
                       onClick={() => setGameState('START')}
                       className="btn-secondary px-10 py-4 rounded-full font-bold uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-2"
                     >
                        Menu chính
                     </button>
                     <button 
                       onClick={startGame}
                       className="btn-primary px-10 py-4 rounded-full font-bold uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-2"
                     >
                        Chơi Lại
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* Footer Info */}
      <footer className="absolute bottom-8 left-8 right-8 flex justify-between items-end z-20 pointer-events-none">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 text-dynamic">Motion Accuracy</span>
            <div className="w-32 h-1 bg-slate-300 mt-1 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 text-dynamic">Webcam Status</span>
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Active & Tracking</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-dynamic-muted">Linguistic Engine</div>
        </div>
      </footer>

      {/* Question Modal */}
      {gameState === 'QUESTION' && !currentQuestion && (
        <div className="absolute inset-0 flex items-center justify-center bg-dynamic-overlay backdrop-blur-xl z-50">
          <div className="glass-modal px-12 py-10 rounded-[2rem] text-center font-black flex flex-col items-center gap-6 border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
             <div className="w-16 h-16 border-[6px] border-slate-100 border-t-purple-500 rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.2)]"></div>
             <p className="text-xl uppercase tracking-widest font-display text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Generating Question...</p>
          </div>
        </div>
      )}
      <QuestionModal 
         question={currentQuestion}
         onAnswerComplete={handleAnswerComplete}
      />
    </div>
  );
};
