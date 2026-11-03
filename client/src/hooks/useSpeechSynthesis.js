import { useCallback, useEffect, useState } from 'react';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Preferred voice languages per reply language. Hinglish is Roman script, so an Indian English voice reads it best.
const PREFERRED = {
  en: ['en-IN', 'en-GB', 'en-US'],
  hinglish: ['en-IN', 'hi-IN', 'en-GB', 'en-US'],
  hi: ['hi-IN', 'en-IN'],
};

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text, { language = 'en', rate = 1, voiceURI = '' } = {}) => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const all = window.speechSynthesis.getVoices();
    let voice = voiceURI ? all.find((v) => v.voiceURI === voiceURI) : null;
    if (!voice) {
      for (const tag of PREFERRED[language] || PREFERRED.en) {
        voice = all.find((v) => v.lang?.replace('_', '-') === tag);
        if (voice) break;
      }
    }
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    }
    u.rate = rate;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { supported, voices, speaking, speak, cancel };
}
