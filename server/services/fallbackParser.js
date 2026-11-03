// Rule-based intent parser used when Gemini is not configured or the API call fails.
// It handles the common English + Hinglish command shapes; Gemini handles everything else.

const WEEKDAYS = [
  ['sunday', 'ravivar', 'itwar'], ['monday', 'somvar'], ['tuesday', 'mangalvar'],
  ['wednesday', 'budhvar'], ['thursday', 'guruvar', 'veervar'], ['friday', 'shukravar'], ['saturday', 'shanivar'],
];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const HINGLISH = /\b(mujhe|mera|meri|mere|kal|aaj|parso|karna|karni|hai|hain|bana|banao|laga|lagao|dikhao|batao|kya|baje|jaana|jana|ho gaya|ho gayi|kar do|kar diya|wala|wali|shikayat|kharab|nahi|likh)\b/i;

function addDays(today, days) {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parseDate(text, today) {
  const t = text.toLowerCase();
  if (/\b(day after tomorrow|parso|parson)\b/.test(t)) return addDays(today, 2);
  if (/\b(yesterday)\b/.test(t)) return addDays(today, -1);
  if (/\b(tomorrow|tmrw|kal)\b/.test(t)) return addDays(today, 1);
  if (/\b(today|tonight|aaj)\b/.test(t)) return today;
  if (/\bnext week\b|\bagle hafte\b/.test(t)) return addDays(today, 7);

  const todayDow = new Date(`${today}T00:00:00Z`).getUTCDay();
  for (let i = 0; i < 7; i++) {
    if (WEEKDAYS[i].some((w) => new RegExp(`\\b${w}\\b`).test(t))) {
      const diff = (i - todayDow + 7) % 7 || 7;
      return addDays(today, diff);
    }
  }

  const m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/)
    || t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (m) {
    const [day, mon] = /\d/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]];
    const year = Number(today.slice(0, 4));
    let iso = `${year}-${String(MONTHS.indexOf(mon) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (iso < today) iso = `${year + 1}${iso.slice(4)}`;
    return iso;
  }
  return null;
}

export function parseTime(text) {
  const t = text.toLowerCase();
  const m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|baje|o'?clock)\b/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] || '00';
  const suffix = m[3];
  if (h > 23) return null;
  if (suffix.startsWith('p') && h < 12) h += 12;
  else if (suffix.startsWith('a') && h === 12) h = 0;
  else if (!suffix.startsWith('a') && !suffix.startsWith('p')) {
    // "baje" / "o'clock": use shaam/raat/subah hints, otherwise assume 1-6 means afternoon/evening
    if (/\b(shaam|sham|raat|evening|night)\b/.test(t) && h < 12) h += 12;
    else if (!/\b(subah|morning)\b/.test(t) && h >= 1 && h <= 6) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${min}`;
}

function detectLanguage(text) {
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  return HINGLISH.test(text) ? 'hinglish' : 'en';
}

function detectPriority(t) {
  if (/\b(urgent|asap|important|high priority|jaldi|zaroori|emergency)\b/.test(t)) return 'high';
  if (/\b(low priority|whenever|no rush)\b/.test(t)) return 'low';
  return 'medium';
}

function ordinal(t) {
  if (/\b(last|aakhri|akhri)\b/.test(t)) return -1;
  const words = { first: 1, '1st': 1, pehla: 1, pehli: 1, second: 2, '2nd': 2, doosra: 2, dusra: 2, dusri: 2, third: 3, '3rd': 3, teesra: 3, teesri: 3, fourth: 4, fifth: 5 };
  for (const [w, i] of Object.entries(words)) if (new RegExp(`\\b${w}\\b`).test(t)) return i;
  const num = t.match(/\b(?:task|number|no\.?|#)\s*(\d{1,3})\b/);
  return num ? Number(num[1]) : null;
}

// Strips command phrasing, dates and times so what remains is the record's title.
function cleanTitle(text, kind) {
  let s = ` ${text} `;
  const patterns = [
    /\b(please|plz|hey|ok|okay|voicemate)\b/gi,
    /\b(can you|could you|i want to|i need to|i have to|i want you to)\b/gi,
    /\b(create|add|make|new|set|save|register|file|raise|log)\s+(a|an|one|my)?\s*(new\s+)?(task|reminder|todo|to-do|note|complaint|ticket)s?\b/gi,
    /\b(ek|koi)?\s*(task|reminder|note|complaint|shikayat)\s*(bana|banao|laga|lagao|likh|likho|kar|register kar|darj kar)\s*(do|dena|lo|de)?\b/gi,
    /\b(remind me to|remind me|reminder for|reminder to|reminder)\b/gi,
    /\b(task|note|complaint)\s+(to|for|about|that|regarding|on)\b/gi,
    /\b(about|regarding|that|to)\b(?=\s)/i,
    /\b(mujhe|mera|meri|mere|main|mai)\b/gi,
    /\b(hai|hain)\b/gi,
    /\b(do|dena)\s*$/gi,
    /\b(urgent|asap|high priority|low priority)\b/gi,
  ];
  // Notes keep their dates in the title ("Exam is on Monday"); tasks store them as fields instead.
  const whenPatterns = [
    /\b(day after tomorrow|tomorrow|tmrw|today|tonight|next week|parso|parson|kal|aaj|agle hafte)\b/gi,
    /\b(on|by|at)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|somvar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar)\b/gi,
    /\b(at|by)?\s*\d{1,2}([:.]\d{2})?\s*(am|pm|a\.m\.|p\.m\.|baje|o'?clock)\b/gi,
    /\b(subah|shaam|sham|raat|morning|evening)\b/gi,
  ];
  for (const p of kind === 'note' ? patterns : [...patterns, ...whenPatterns]) s = s.replace(p, ' ');
  s = s.replace(/[,.!?]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(to|for|about|that|the|a|an|my)\s+/i, '').replace(/\s+(hai|do)$/i, '').trim();
  if (!s) return kind === 'note' ? 'Quick note' : null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function complaintCategory(t) {
  if (/\b(fan|ac|light|projector|bulb|switch|electric|power|socket)\b/.test(t)) return 'electrical';
  if (/\b(wifi|wi-fi|internet|network|computer|pc|lab|printer)\b/.test(t)) return 'it';
  if (/\b(water|washroom|toilet|clean|dirty|garbage|safai)\b/.test(t)) return 'maintenance';
  if (/\b(canteen|food|mess|khana)\b/.test(t)) return 'canteen';
  if (/\b(bench|desk|chair|door|window|furniture)\b/.test(t)) return 'infrastructure';
  return 'general';
}

function location(t) {
  const m = t.match(/\b(classroom|class room|library|lab|laboratory|hostel|canteen|auditorium|washroom|corridor|room\s*\d+|block\s*[a-z0-9]+)\b/i);
  return m ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()) : null;
}

export function parseFallback(text, { today }) {
  const t = text.toLowerCase();
  const language = detectLanguage(text);
  const base = { language, date: null, time: null, priority: detectPriority(t), category: 'general' };

  const mentionsTask = /\b(task|tasks|todo|to-do|reminder|reminders|kaam)\b/.test(t);
  const isView = /\b(show|list|view|display|what are|what's|whats|tell me|read|summari[sz]e|summary|dikhao|dikha|batao|bata|sunao)\b/.test(t);
  const isCreate = /^(please\s+|hey\s+|ok\s+)?(create|add|make|new|set|save|remind|register|file|raise|log|note down)\b/.test(t)
    || /\b(bana|banao|laga|lagao|likh|likho|save kar|add kar|register kar|darj)\b/.test(t);

  if (/\b(delete|remove|hata|hatao|mita|mitao|cancel)\b/.test(t) && mentionsTask) {
    return { ...base, intent: 'DELETE_TASK', taskIndex: ordinal(t), taskKeyword: null };
  }

  if (isView && !isCreate) {
    if (/\b(note|notes)\b/.test(t)) return { ...base, intent: 'VIEW_NOTES' };
    if (/\b(complaint|complaints|ticket|tickets|shikayat)\b/.test(t)) return { ...base, intent: 'VIEW_COMPLAINTS' };
    let filter = 'pending';
    if (/\b(completed|done|finished)\b/.test(t)) filter = 'completed';
    else if (/\b(today|aaj|today's)\b/.test(t)) filter = 'today';
    else if (/\b(all)\b/.test(t)) filter = 'all';
    return { ...base, intent: 'VIEW_TASKS', filter };
  }

  if (!isCreate && /\b(mark|complete|completed|done|finish|finished|ho gaya|ho gayi|kar liya|kar diya|poora|pura)\b/.test(t)) {
    return { ...base, intent: 'COMPLETE_TASK', taskIndex: ordinal(t), taskKeyword: null };
  }

  if (/\b(complaint|complain|shikayat|ticket|not working|broken|kharab|issue with|problem with)\b/.test(t)) {
    const title = cleanTitle(text, 'complaint')?.replace(/^(the|a)\s+/i, '') || 'Campus issue';
    return {
      ...base, intent: 'CREATE_COMPLAINT', title: title.charAt(0).toUpperCase() + title.slice(1),
      description: text, category: complaintCategory(t), location: location(t),
    };
  }

  if (/\b(note|notes|likh lo|likh do|yaad rakh)\b/.test(t)) {
    return { ...base, intent: 'CREATE_NOTE', title: cleanTitle(text, 'note'), description: text, date: parseDate(t, today) };
  }

  if (isCreate || mentionsTask || /\b(karna hai|jaana hai|jana hai|submit|study|padhna|complete my|finish my)\b/.test(t)) {
    return {
      ...base, intent: 'CREATE_TASK', title: cleanTitle(text, 'task'), description: null,
      date: parseDate(t, today), time: parseTime(t),
      category: /\b(remind|reminder|yaad)\b/.test(t) ? 'reminder' : /\b(assignment|exam|study|homework|padhna|project|submit)\b/.test(t) ? 'study' : 'general',
    };
  }

  return { ...base, intent: 'GENERAL_QUERY', answer: null };
}
