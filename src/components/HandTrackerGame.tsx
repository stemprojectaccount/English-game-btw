import React, { useRef, useEffect, useState, useCallback } from 'react';
import { initializeHandTracker } from '../utils/handTracker';
import { getRandomQuestion, Question, Difficulty } from '../utils/questions';
import { playPopSound, playStartSound, playEndSound } from '../utils/audio';
import { QuestionModal } from './QuestionModal';
import { Trophy, Timer, Play } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Ball {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  color: string;
  active: boolean;
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
  const [tutorialPhase, setTutorialPhase] = useState<'HAND' | 'BALLOON' | 'QUESTION' | 'DONE'>('HAND');
  const tutorialHandDetected = useRef(false);

  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastBallTime = useRef<number>(0);

  const usedQuestionIdsRef = useRef<Set<string>>(new Set());

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
            }
        } catch (error) {
            console.error("Error accessing camera or initializing ML:", error);
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
              let q = await generateQuestion(difficulty);
              
              if (!q) {
                  q = getRandomQuestion(difficulty, usedQuestionIdsRef.current);
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
    
    // Draw video horizontally flipped
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

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
        if (tutorialPhase === 'HAND' && handPointsList.length > 0 && !tutorialHandDetected.current) {
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
                    active: true
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
            radius: 60 + Math.random() * 20, // Made balls larger
            speed: (canvas.height + 150) / (currentSettings.fallTime * 60),
            color: colors[Math.floor(Math.random() * colors.length)],
            active: true
        });
        lastBallTime.current = now;
    }

    let poppedThisFrame = false;

    ballsRef.current.forEach((ball, i) => {
        if (!ball.active) return;
        if (gameState === 'PLAYING' || (isTutorial && tutorialPhase === 'BALLOON')) {
            ball.y += ball.speed;
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
                if (dist < radiusY + 15) { 
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
              active: true
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

  return (
    <div className="relative w-full h-screen bg-[#0A0A0F] text-white font-sans overflow-hidden select-none">
      
      {/* Hidden Video element for ML processing */}
      <video ref={videoRef} className="hidden" playsInline muted />
      
      {/* Simulated Camera Feed / Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#12121e]/80 via-[#0a0a0f]/80 to-[#1e121e]/80 z-0"></div>
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#3b82f6_0%,transparent_50%)] z-0"></div>

      {/* Main Canvas covering the screen */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-cover z-10 opacity-70"
      />

      {/* Visual Overlay "Sparkle" Effects */}
      <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-white rounded-full shadow-[0_0_15px_5px_rgba(255,255,255,0.8)] z-0 pointer-events-none"></div>
      <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_20px_8px_rgba(59,130,246,0.6)] z-0 pointer-events-none"></div>

      {/* Top Navigation & Stats Bar */}
      <header className="absolute top-0 w-full p-8 flex justify-between items-start z-20 pointer-events-none">
          <div className="flex flex-col">
             <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400 mb-1">Điểm Hiện Tại</span>
             <span className="text-7xl font-black italic leading-none">{score}</span>
          </div>

          <div className="flex flex-col items-center">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-8 py-3 flex items-center gap-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-2xl font-mono font-bold tracking-tighter">
                   {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
             </div>
             <div className="w-48 h-2 bg-white/20 rounded-full mt-4 overflow-hidden shadow-[0_0_10px_rgba(255,0,0,0.3)]">
                <div 
                   className="h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,0,0,0.8)]"
                   style={{ 
                     width: `${(timeLeft / getDifficultySettings(difficulty).duration) * 100}%`,
                     backgroundColor: timeLeft <= 10 ? '#ef4444' : timeLeft <= 30 ? '#eab308' : '#3b82f6'
                   }}
                />
             </div>
          </div>
          
          <div className={`flex flex-col items-end transition-opacity duration-300 ${combo > 1 ? 'opacity-100' : 'opacity-0'}`}>
             <span className="text-xs font-black uppercase tracking-[0.3em] text-pink-500 mb-1">Chuỗi Combo</span>
             <span className="text-5xl font-black italic leading-none">x{combo}</span>
          </div>
      </header>

      {/* Tutorial Overlay */}
      {isTutorial && (gameState === 'TUTORIAL' || gameState === 'POPPING' || gameState === 'QUESTION') && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center">
             {tutorialPhase === 'HAND' && (
                 <div className="bg-white text-black px-8 py-6 rounded-3xl shadow-[10px_10px_0px_#3b82f6] animate-bounce">
                    <h2 className="text-3xl font-black uppercase">Bước 1: Quét Bàn Tay</h2>
                    <p className="text-lg font-bold mt-2">
                        {tutorialHandDetected.current 
                           ? "Tuyệt vời! Hãy giữ tay bạn trong khung hình." 
                           : "Hãy đưa tay lên trước camera để vẫy bóng nhé!"}
                    </p>
                 </div>
             )}
             {tutorialPhase === 'BALLOON' && (
                 <div className="bg-white text-black px-8 py-6 rounded-3xl shadow-[10px_10px_0px_#f59e0b] animate-bounce">
                    <h2 className="text-3xl font-black uppercase">Bước 2: Đập Bóng!</h2>
                    <p className="text-lg font-bold mt-2">Di chuyển tay của bạn chạm vào quả bóng đang rơi để đập vỡ nó.</p>
                 </div>
             )}
             {tutorialPhase === 'DONE' && (
                 <div className="bg-white text-black px-8 py-6 rounded-3xl shadow-[10px_10px_0px_#10b981] animate-bounce">
                    <h2 className="text-4xl font-black uppercase text-green-600">Hoàn Thành!</h2>
                    <p className="text-xl font-bold mt-2">Bạn đã hoàn thành phần hướng dẫn.</p>
                 </div>
             )}
          </div>
      )}

      {/* Start Screen */}
      {gameState === 'START' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40">
             <div className="bg-white text-black p-12 shadow-[20px_20px_0px_#3b82f6] max-w-2xl text-center pointer-events-auto flex flex-col gap-6">
                 <p className="text-sm font-bold tracking-widest text-slate-500 uppercase -mb-4">Made by ThanhDat7A</p>
                 <h1 className="text-6xl font-black leading-[0.9] tracking-tighter uppercase">Pop & <span className="text-blue-600">Learn</span></h1>
                 <p className="text-black font-bold text-lg mb-4">
                     Di chuyển tay để đập vỡ những quả bóng đang rơi. Trả lời đúng các câu hỏi tiếng Anh để ghi điểm! 
                     Vui lòng cấp quyền truy cập camera để bắt đầu.
                 </p>
                 
                 {/* Difficulty Selection */}
                 <div className="flex flex-col gap-2 mb-2 w-full text-left">
                    <h3 className="text-xl font-black uppercase text-blue-600 mb-2">Độ Khó:</h3>
                    <div className="grid grid-cols-2 gap-3">
                       {[
                         { id: 'easy', label: 'Easy', time: '10 phút', desc: 'Điểm x0.5' },
                         { id: 'medium', label: 'Medium', time: '5 phút', desc: 'Điểm x1' },
                         { id: 'hard', label: 'Hard', time: '3 phút', desc: 'Điểm x2' },
                         { id: 'impossible', label: 'Impossible', time: '1 phút', desc: 'Điểm x3' },
                       ].map(d => (
                          <button
                             key={d.id}
                             onClick={() => setDifficulty(d.id as Difficulty)}
                             className={`flex flex-col items-center justify-center py-3 px-2 font-black uppercase border-4 transition-all rounded-lg ${
                                difficulty === d.id 
                                ? 'border-blue-600 bg-blue-100 text-blue-800 scale-105 shadow-[4px_4px_0px_#2563eb]' 
                                : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:text-blue-500'
                             }`}
                          >
                             <span className="text-lg">{d.label}</span>
                             <span className="text-[10px] sm:text-xs font-bold opacity-80 mt-1 tracking-wider">{d.time} | {d.desc}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="flex gap-4 justify-center mt-4">
                     <button 
                       onClick={startTutorial}
                       className="px-8 py-3 bg-slate-200 text-slate-800 font-black uppercase text-xl justify-center tracking-widest shadow-[6px_6px_0px_#000] hover:translate-y-1 hover:shadow-[2px_2px_0px_#000] transition-all flex items-center gap-2"
                     >
                        Hướng Dẫn
                     </button>
                     <button 
                       onClick={startGame}
                       className="px-12 py-3 bg-blue-600 text-white font-black uppercase text-xl justify-center tracking-widest shadow-[6px_6px_0px_#000] hover:translate-y-1 hover:shadow-[2px_2px_0px_#000] transition-all flex items-center gap-2"
                     >
                        Bắt Đầu Chơi
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* End / Game Over Screen */}
      {(gameState === 'END' || gameState === 'GAMEOVER') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-40">
             <div className="bg-white text-black p-12 shadow-[20px_20px_0px_#3b82f6] max-w-2xl text-center pointer-events-auto flex flex-col gap-6">
                 <h2 className="text-6xl font-black leading-[0.9] tracking-tighter uppercase mb-4">
                     {gameState === 'END' ? <>Hết <span className="text-red-500">Giờ!</span></> : <>Thua <span className="text-red-500">Cuộc!</span></>}
                 </h2>
                 {gameState === 'GAMEOVER' && <p className="text-xl font-bold text-slate-600 mb-2">Bạn đã để bóng rơi xuống đất!</p>}
                 
                 <div className="py-6">
                    <p className="text-xs font-black uppercase tracking-widest mb-1">Điểm Số</p>
                    <p className="text-8xl font-black italic">{score}</p>
                 </div>

                 <div className="flex gap-4 justify-center">
                     <button 
                       onClick={() => setGameState('START')}
                       className="px-8 py-3 bg-slate-200 text-slate-800 font-black uppercase text-lg items-center justify-center tracking-widest shadow-[6px_6px_0px_#94a3b8] hover:translate-y-1 hover:shadow-[2px_2px_0px_#94a3b8] transition-all flex gap-2"
                     >
                        Menu
                     </button>
                     <button 
                       onClick={startGame}
                       className="px-8 py-3 bg-blue-600 text-white font-black uppercase text-lg items-center justify-center tracking-widest shadow-[6px_6px_0px_#000] hover:translate-y-1 hover:shadow-[2px_2px_0px_#000] transition-all flex gap-2"
                     >
                        Retry
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* Footer Info */}
      <footer className="absolute bottom-8 left-8 right-8 flex justify-between items-end z-20 pointer-events-none">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Motion Accuracy</span>
            <div className="w-32 h-1 bg-white/20 mt-1">
              <div className="w-3/4 h-full bg-lime-400"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Webcam Status</span>
            <span className="text-lime-400 text-xs font-bold uppercase tracking-tighter">Active & Tracking</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Interactive Linguistic Engine</div>
        </div>
      </footer>

      {/* Question Modal */}
      {gameState === 'QUESTION' && !currentQuestion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white text-black px-12 py-8 shadow-[10px_10px_0px_#3b82f6] text-center font-black animate-pulse flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
             <p className="text-2xl uppercase mt-4">Generating Question...</p>
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
