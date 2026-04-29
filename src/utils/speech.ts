export const speakText = (text: string) => {
    if (!window.speechSynthesis) {
        console.warn('SpeechSynthesis API not supported');
        return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Always read in English
    utterance.rate = 0.9; // Slightly slower for clarity
    
    // Attempt to find a natural English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Google')) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (englishVoice) {
        utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
};
