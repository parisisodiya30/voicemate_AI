import { useCallback, useState } from 'react';

// Per-device preferences only (language, voice). All app data lives in the server's SQLite database.
const KEY = 'voicemate.settings';
const DEFAULTS = { recogLang: 'en-IN', autoRun: true, voiceEnabled: true, rate: 1, voiceURI: '', userName: '' };

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);
  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable (private mode) — keep in memory */
      }
      return next;
    });
  }, []);
  return [settings, update];
}
