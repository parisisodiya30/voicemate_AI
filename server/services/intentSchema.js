// Validates and normalises the structured intent (from Gemini or the fallback parser)
// before anything touches the database.

export const INTENTS = [
  'CREATE_TASK', 'VIEW_TASKS', 'COMPLETE_TASK', 'DELETE_TASK',
  'CREATE_COMPLAINT', 'VIEW_COMPLAINTS', 'CREATE_NOTE', 'VIEW_NOTES', 'GENERAL_QUERY',
];
const PRIORITIES = ['low', 'medium', 'high'];
const FILTERS = ['pending', 'completed', 'today', 'all'];
const LANGUAGES = ['en', 'hinglish', 'hi'];

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function validDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v;
}

function validTime(v) {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?m?\.?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  // Accept "5:00 PM" too, in case the model ignores the 24-hour instruction.
  if (m[3]?.toLowerCase() === 'p' && h < 12) h += 12;
  if (m[3]?.toLowerCase() === 'a' && h === 12) h = 0;
  return h < 24 && min < 60 ? `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}` : null;
}

export function validateIntent(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['AI response was not a JSON object'], value: null };
  }

  const intent = INTENTS.includes(raw.intent) ? raw.intent : null;
  if (!intent) errors.push(`Unknown intent "${raw.intent}"`);

  // taskIndex is the 1-based position in the pending list (-1 = last), as the user says it ("my first task").
  const idx = raw.taskIndex === null || raw.taskIndex === undefined ? NaN : Number(raw.taskIndex);
  const taskIndex = Number.isInteger(idx) && (idx > 0 || idx === -1) ? idx : null;

  const value = {
    intent: intent || 'GENERAL_QUERY',
    title: str(raw.title, 120),
    description: str(raw.description, 1000),
    date: validDate(raw.date),
    time: validTime(raw.time),
    priority: PRIORITIES.includes(String(raw.priority).toLowerCase()) ? String(raw.priority).toLowerCase() : 'medium',
    category: (str(raw.category, 40) || 'general').toLowerCase(),
    location: str(raw.location, 80),
    taskIndex,
    taskKeyword: str(raw.taskKeyword, 80),
    filter: FILTERS.includes(raw.filter) ? raw.filter : 'pending',
    language: LANGUAGES.includes(raw.language) ? raw.language : 'en',
    answer: str(raw.answer, 600),
  };

  if (['CREATE_TASK', 'CREATE_NOTE', 'CREATE_COMPLAINT'].includes(value.intent) && !value.title) {
    errors.push('A title is required to create a record');
  }

  return { ok: errors.length === 0, errors, value };
}
