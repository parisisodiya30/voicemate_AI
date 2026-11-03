import { useCallback, useEffect, useRef, useState } from 'react';

// Browser Web Speech API (Chrome / Edge / Safari). Firefox has no support -> UI falls back to typing.
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const RECOGNITION_ERRORS = {
  'not-allowed': 'Microphone permission was denied. Allow mic access in your browser settings, or type your command below.',
  'service-not-allowed': 'Speech recognition is blocked in this browser. Please type your command instead.',
  'no-speech': "I didn't hear anything. Tap the mic and try speaking again.",
  'audio-capture': 'No microphone was found. Connect a mic or type your command.',
  network: 'Speech recognition needs an internet connection. Check your network or type instead.',
  unsupported: 'Voice input is not supported in this browser. Use Chrome or Edge, or type your command.',
  'start-failed': 'Could not start the microphone. Please try again.',
};

export function useSpeechRecognition({ lang = 'en-IN', onFinal } = {}) {
  const supported = Boolean(Recognition);
  const recRef = useRef(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);

  const start = useCallback(() => {
    if (!supported) return setError('unsupported');
    recRef.current?.abort();

    const rec = new Recognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    finalRef.current = '';
    interimRef.current = '';
    setInterim('');
    setError(null);

    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let fin = '';
      let int = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else int += r[0].transcript;
      }
      finalRef.current = fin;
      interimRef.current = int;
      setInterim(`${fin} ${int}`.trim());
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(e.error);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const text = (finalRef.current || interimRef.current).trim();
      if (text) onFinalRef.current?.(text);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError('start-failed');
    }
  }, [lang, supported]);

  const stop = useCallback(() => recRef.current?.stop(), []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, interim, error, start, stop, clearError: () => setError(null) };
}
