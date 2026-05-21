export const playTone = (frequency: number, type: OscillatorType, duration: number, volume: number = 0.5) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
};

let bgmAudio: HTMLAudioElement | null = null;
let bgmPreferredEnabled = localStorage.getItem('bgm_preferred_enabled') !== 'false';

export const playBGM = (force: boolean = false) => {
    // If the user preferred not to play background music, do not play unless forced
    if (!bgmPreferredEnabled && !force) {
        return;
    }

    if (!bgmAudio) {
        bgmAudio = new Audio('/bgm.mp3');
        bgmAudio.loop = true;
        bgmAudio.volume = 0.4;
    }
    
    if (bgmAudio.paused) {
        let playPromise = bgmAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Autoplay prevented:", error);
            });
        }
    }
};

export const stopBGM = () => {
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
};

export const isBGMPlaying = (): boolean => {
    return bgmAudio ? !bgmAudio.paused : false;
};

export const getBGMPreference = (): boolean => {
    return bgmPreferredEnabled;
};

export const toggleBGM = (): boolean => {
    bgmPreferredEnabled = !bgmPreferredEnabled;
    localStorage.setItem('bgm_preferred_enabled', String(bgmPreferredEnabled));

    if (bgmPreferredEnabled) {
        playBGM(true);
        return true;
    } else {
        if (bgmAudio) {
            bgmAudio.pause();
        }
        return false;
    }
};

export const setBGMVolume = (volume: number) => {
    if (!bgmAudio) {
        playBGM();
    }
    if (bgmAudio) {
        bgmAudio.volume = volume;
    }
};

export const getBGMVolume = (): number => {
    return bgmAudio ? bgmAudio.volume : 0.4;
};

export const playPopSound = () => {
    playTone(600, 'sine', 0.1, 0.3);
    setTimeout(() => playTone(800, 'sine', 0.15, 0.2), 50);
};

export const playCorrectSound = () => {
    playTone(400, 'sine', 0.1, 0.3);
    setTimeout(() => playTone(600, 'sine', 0.1, 0.3), 100);
    setTimeout(() => playTone(800, 'sine', 0.3, 0.3), 200);
};

export const playIncorrectSound = () => {
    playTone(300, 'sawtooth', 0.2, 0.3);
    setTimeout(() => playTone(250, 'sawtooth', 0.4, 0.3), 200);
};

export const playStartSound = () => {
    playTone(440, 'square', 0.1, 0.2);
    setTimeout(() => playTone(554, 'square', 0.1, 0.2), 100);
    setTimeout(() => playTone(659, 'square', 0.1, 0.2), 200);
    setTimeout(() => playTone(880, 'square', 0.4, 0.2), 300);
};

export const playEndSound = () => {
    playTone(880, 'triangle', 0.2, 0.3);
    setTimeout(() => playTone(784, 'triangle', 0.2, 0.3), 200);
    setTimeout(() => playTone(698, 'triangle', 0.2, 0.3), 400);
    setTimeout(() => playTone(659, 'triangle', 0.6, 0.3), 600);
};
