// Gemini intent engine (REST API, key stays on the server).
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);
export const geminiModel = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

function systemPrompt({ today, now, weekday, pendingTasks }) {
  const list = pendingTasks.length
    ? pendingTasks.map((t, i) => `${i + 1}. ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')
    : '(none)';

  return `You are the intent engine of "VoiceMate AI", a voice assistant for college students.
Users speak English, Hindi, or Hinglish (Hindi written in Roman script). Convert the command into ONE JSON object.

Today is ${today} (${weekday}). The user's current local time is ${now}.
The user's pending tasks, in the order shown to them:
${list}

Return ONLY JSON with exactly these keys:
{
  "intent": one of "CREATE_TASK","VIEW_TASKS","COMPLETE_TASK","DELETE_TASK","CREATE_COMPLAINT","VIEW_COMPLAINTS","CREATE_NOTE","VIEW_NOTES","GENERAL_QUERY",
  "title": short title (max 8 words, in the user's language, Roman script for Hinglish) or null,
  "description": extra details or null,
  "date": "YYYY-MM-DD" or null,
  "time": "HH:MM" 24-hour or null,
  "priority": "low" | "medium" | "high",
  "category": one lowercase word, e.g. "study", "reminder", "personal", "electrical", "it", "maintenance", "canteen", "infrastructure", "general",
  "location": place mentioned (e.g. "Classroom", "Library") or null,
  "taskIndex": for COMPLETE_TASK / DELETE_TASK, the 1-based number of the task in the list above ("first" = 1, "last" = -1), else null,
  "taskKeyword": for COMPLETE_TASK / DELETE_TASK, a word from the task title the user referred to, else null,
  "filter": for VIEW_TASKS: "pending" | "completed" | "today" | "all" (default "pending"; "summarize my tasks for today" = "today"),
  "language": "en" | "hinglish" | "hi",
  "answer": for GENERAL_QUERY only, a helpful answer in at most 2 short sentences in the user's language, else null
}

Rules:
- Reminders ("reminder laga do", "remind me") are CREATE_TASK with category "reminder".
- Resolve relative dates from today: "kal" in a request means tomorrow, "parso" = day after tomorrow, weekday names = the next such day.
- "10 baje" without am/pm: pick the next upcoming occurrence after the current time, unless context says otherwise (subah = morning, shaam/raat = evening/night).
- Relative times ("2 minute baad", "in 1 hour", "1 ghante baad") are counted from the current time.
- For CREATE_NOTE, "description" is the full note text as the user said it (e.g. "My exam is on Monday"); "title" is a short summary.
- Always fill "date" (and "time") when the user mentions a day or time, including past ones ("yesterday" = the day before today, "last Monday"). Never drop a past date.
- Complaints about broken or faulty campus things are CREATE_COMPLAINT. Infer category and priority.
- Never invent tasks that are not in the list. If a referenced task is unclear, set taskIndex to null.
- Do not include any text outside the JSON.`;
}

// Primary model, then a backup when the primary is overloaded (503), rate-limited, retired (404) or slow.
const modelChain = () => [...new Set([geminiModel(), process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest'])];

export async function interpretWithGemini(text, context) {
  let lastError;
  for (const model of modelChain()) {
    try {
      return { intent: await callModel(model, text, context), model };
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] ${model} failed: ${err.message.slice(0, 120)}`);
    }
  }
  throw lastError;
}

async function callModel(model, text, context) {
  const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(Number(process.env.GEMINI_TIMEOUT_MS) || 8000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(context) }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned invalid JSON');
  }
}
