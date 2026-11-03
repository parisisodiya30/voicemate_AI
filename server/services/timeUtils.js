// Deterministic time handling that should not be left to the AI:
// relative times ("2 minute baad", "in 1 hour") and hours spoken without AM/PM ("5 baje").

const NUMBER_WORDS = {
  a: 1, an: 1, one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4,
  five: 5, paanch: 5, panch: 5, ten: 10, das: 10, fifteen: 15, pandrah: 15, twenty: 20, bees: 20,
  thirty: 30, tees: 30, 'half an': 0.5, 'half a': 0.5, aadha: 0.5, adha: 0.5, aadhe: 0.5,
};
const NUM = `(\\d{1,3}|${Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join('|')})`;
const UNIT = '(minutes?|mins?|minat|minton|ghant[ae]|ghanton|hours?|hrs?)';
const BEFORE = new RegExp(`\\b(?:in|after|within)\\s+${NUM}\\s*${UNIT}\\b`, 'i');
const AFTER = new RegExp(`\\b${NUM}\\s*${UNIT}\\s*(?:baad|bad|later|from now|me|mein|main)\\b`, 'i');
const MERIDIEM = /\b(am|pm|a\.m\.|p\.m\.|subah|sawere|savere|dopahar|dopehar|shaam|sham|raat|morning|afternoon|evening|night|tonight|noon|midnight)\b/i;

const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const pad = (n) => String(n).padStart(2, '0');

// "Mujhe 2 minute baad…" / "remind me in 1 hour" -> exact { date, time } from the user's current time.
export function relativeDateTime(text, today, now) {
  const m = text.match(BEFORE) || text.match(AFTER);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const amount = /\d/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
  if (!amount) return null;
  const minutes = Math.max(1, Math.round(/^(ghant|hour|hr)/i.test(m[2]) ? amount * 60 : amount));
  const d = new Date(`${today}T${now}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return { date: d.toISOString().slice(0, 10), time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` };
}

// "5 baje" said at 17:00 means 17:00 tomorrow-or-today? We pick the next upcoming 5 o'clock today (17:00)
// when no AM/PM word was spoken and the morning time has already passed.
export function resolveAmbiguousHour(text, date, time, today, now) {
  if (!time || MERIDIEM.test(text)) return time;
  if ((date || today) !== today) return time;
  const t = toMinutes(time);
  const n = toMinutes(now);
  if (t < n && t < 12 * 60 && t + 12 * 60 >= n) return `${pad(Math.floor(t / 60) + 12)}:${time.slice(3, 5)}`;
  return time;
}
