// Voice command pipeline: text -> intent (Gemini or fallback) -> validation -> real DB action -> spoken reply.
import * as store from '../services/store.js';
import { interpretWithGemini, geminiConfigured } from '../services/gemini.js';
import { parseFallback } from '../services/fallbackParser.js';
import { validateIntent } from '../services/intentSchema.js';
import { relativeDateTime, resolveAmbiguousHour } from '../services/timeUtils.js';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Replies are English for "en", Roman-script Hinglish otherwise.
const say = (lang, en, hi) => (lang === 'en' ? en : hi);

function serverToday() {
  return new Date().toISOString().slice(0, 10);
}

function friendlyDate(date, today, lang) {
  if (!date) return '';
  const diff = Math.round((new Date(`${date}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
  if (diff === 0) return say(lang, 'today', 'aaj');
  if (diff === 1) return say(lang, 'tomorrow', 'kal');
  const d = new Date(`${date}T00:00:00Z`);
  const label = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return say(lang, `on ${label}`, `${label} ko`);
}

function friendlyTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

function listForSpeech(items, lang, max = 3) {
  const titles = items.slice(0, max).map((i) => i.title);
  const more = items.length > max ? say(lang, `, and ${items.length - max} more`, `, aur ${items.length - max} aur`) : '';
  if (titles.length <= 1) return titles.join('') + more;
  return `${titles.slice(0, -1).join(', ')} ${say(lang, 'and', 'aur')} ${titles.at(-1)}${more}`;
}

function resolveTask(intent, pending) {
  if (intent.taskIndex === -1) return pending.at(-1) || null;
  if (intent.taskIndex) return pending[intent.taskIndex - 1] || null;
  if (intent.taskKeyword) {
    const kw = intent.taskKeyword.toLowerCase();
    return pending.find((t) => t.title.toLowerCase().includes(kw)) || null;
  }
  return pending.length === 1 ? pending[0] : null;
}

// Tasks, reminders and notes can't be scheduled for a date/time that has already passed.
function rejectPast({ date, time, title, language: lang }, kind, { today, now }) {
  if (!date || !(date < today || (date === today && time && time < now))) return null;
  const when = [friendlyDate(date, today, lang), time ? friendlyTime(time) : ''].filter(Boolean).join(' ');
  return {
    failed: true, action: 'Time already passed', summary: `Rejected ${kind} "${title}": ${when} is in the past`,
    reply: say(lang,
      `That time has already passed (${when}). I can't set a ${kind} in the past. Please choose a future time.`,
      `Yeh time nikal chuka hai (${when}). Purane time ka ${kind} set nahi ho sakta, aage ka time boliye.`),
  };
}

async function interpret(text, ctx) {
  if (geminiConfigured()) {
    try {
      const { intent, model } = await interpretWithGemini(text, ctx);
      return { raw: intent, source: 'gemini', model };
    } catch (err) {
      console.warn('[gemini] falling back to rule parser:', err.message);
      return { raw: parseFallback(text, ctx), source: 'fallback', fallbackReason: 'Gemini request failed, used offline parser' };
    }
  }
  return { raw: parseFallback(text, ctx), source: 'fallback', fallbackReason: 'GEMINI_API_KEY not set, used offline parser' };
}

function execute(intent, ctx) {
  const { language: lang } = intent;
  const { today, pendingTasks } = ctx;

  switch (intent.intent) {
    case 'CREATE_TASK': {
      // "Remind me at 5 pm" with no day means today, so the reminder can fire.
      const date = intent.date || (intent.time ? today : null);
      const isReminder = intent.category === 'reminder';
      const past = rejectPast({ ...intent, date }, isReminder ? 'reminder' : 'task', ctx);
      if (past) return past;
      const task = store.createTask({ ...intent, date });
      const when = [friendlyDate(task.due_date, today, lang), task.due_time ? say(lang, `at ${friendlyTime(task.due_time)}`, friendlyTime(task.due_time)) : '']
        .filter(Boolean).join(' ');
      return {
        action: isReminder ? 'Reminder created' : 'Task created',
        summary: `Created ${isReminder ? 'reminder' : 'task'} "${task.title}"`,
        reply: say(lang,
          `Done! Your ${isReminder ? 'reminder' : 'task'} "${task.title}" has been created${when ? ` for ${when}` : ''}.`,
          `Ho gaya! Aapka ${isReminder ? 'reminder' : 'task'} "${task.title}" ${when ? `${when} ke liye ` : ''}ban gaya hai.`),
        data: { type: 'task', item: task },
      };
    }

    case 'VIEW_TASKS': {
      const items = store.listTasks(intent.filter, today);
      const label = { pending: 'pending', completed: 'completed', today: "today's", all: '' }[intent.filter];
      let reply;
      if (!items.length) {
        reply = intent.filter === 'today'
          ? say(lang, 'You have no tasks due today. Enjoy the free time!', 'Aaj ke liye koi task nahi hai.')
          : say(lang, `You have no ${label} tasks. Nice and clear!`, `Aapke koi ${label} tasks nahi hain.`);
      } else if (intent.filter === 'today') {
        const done = items.filter((t) => t.status === 'completed').length;
        reply = say(lang,
          `You have ${items.length} task${items.length > 1 ? 's' : ''} today, ${done} completed: ${listForSpeech(items, lang)}.`,
          `Aaj aapke ${items.length} tasks hain, ${done} complete: ${listForSpeech(items, lang)}.`);
      } else {
        reply = say(lang,
          `You have ${items.length} ${label} task${items.length > 1 ? 's' : ''}: ${listForSpeech(items, lang)}.`,
          `Aapke ${items.length} ${label} tasks hain: ${listForSpeech(items, lang)}.`);
      }
      return { action: 'Fetched tasks', summary: `Viewed ${label || 'all'} tasks (${items.length})`, reply: reply.replace(/\s+/g, ' '), data: { type: 'tasks', items, filter: intent.filter } };
    }

    case 'COMPLETE_TASK':
    case 'DELETE_TASK': {
      const task = resolveTask(intent, pendingTasks);
      if (!task) {
        return {
          failed: true, action: 'Task not found', summary: 'Could not identify which task',
          reply: pendingTasks.length
            ? say(lang, 'I could not tell which task you meant. Try saying "mark my first task as completed".', 'Kaunsa task, samajh nahi aaya. Boliye "mera pehla task complete karo".')
            : say(lang, 'You have no pending tasks right now.', 'Abhi aapke koi pending tasks nahi hain.'),
        };
      }
      if (intent.intent === 'DELETE_TASK') {
        // Destructive: never delete without explicit confirmation from the user.
        return {
          action: 'Confirmation needed', summary: `Asked to confirm deleting "${task.title}"`,
          reply: say(lang, `Are you sure you want to delete "${task.title}"? Please confirm.`, `Kya aap sach mein "${task.title}" delete karna chahte hain? Confirm kijiye.`),
          requiresConfirmation: true,
          confirm: { action: 'DELETE_TASK', taskId: task.id, label: task.title },
          data: { type: 'task', item: task },
        };
      }
      const updated = store.setTaskStatus(task.id, 'completed');
      return {
        action: 'Task completed', summary: `Completed task "${task.title}"`,
        reply: say(lang, `Great job! "${task.title}" is marked as completed.`, `Shabaash! "${task.title}" complete mark ho gaya hai.`),
        data: { type: 'task', item: updated },
      };
    }

    case 'CREATE_COMPLAINT': {
      const c = store.createComplaint(intent);
      return {
        action: 'Complaint registered', summary: `Registered complaint ${c.ticket_no}: "${c.title}"`,
        reply: say(lang,
          `Your complaint "${c.title}" has been registered. Your ticket number is ${c.ticket_no}.`,
          `Aapki complaint successfully register ho gayi hai. Ticket number hai ${c.ticket_no}.`),
        data: { type: 'complaint', item: c },
      };
    }

    case 'VIEW_COMPLAINTS': {
      const items = store.listComplaints();
      const open = items.filter((c) => c.status !== 'resolved').length;
      return {
        action: 'Fetched complaints', summary: `Viewed complaints (${items.length})`,
        reply: items.length
          ? say(lang, `You have ${items.length} complaint${items.length > 1 ? 's' : ''}, ${open} still open.`, `Aapki ${items.length} complaints hain, ${open} abhi open hain.`)
          : say(lang, 'You have not registered any complaints yet.', 'Abhi tak koi complaint register nahi hui hai.'),
        data: { type: 'complaints', items },
      };
    }

    case 'CREATE_NOTE': {
      const past = rejectPast(intent, 'note', ctx);
      if (past) return past;
      const note = store.createNote(intent);
      return {
        action: 'Note saved', summary: `Saved note "${note.title}"`,
        reply: say(lang, `Got it. I saved a note: "${note.title}".`, `Note save ho gaya: "${note.title}".`),
        data: { type: 'note', item: note },
      };
    }

    case 'VIEW_NOTES': {
      const items = store.listNotes();
      return {
        action: 'Fetched notes', summary: `Viewed notes (${items.length})`,
        reply: items.length
          ? say(lang, `You have ${items.length} note${items.length > 1 ? 's' : ''}: ${listForSpeech(items, lang)}.`, `Aapke ${items.length} notes hain: ${listForSpeech(items, lang)}.`)
          : say(lang, 'You have no notes yet.', 'Abhi koi notes nahi hain.'),
        data: { type: 'notes', items },
      };
    }

    default: {
      const answer = intent.answer || say(lang,
        'I can create tasks and reminders, save notes, register complaints, and show or complete your tasks. Try "Create a task to study maths tomorrow".',
        'Main tasks, reminders, notes aur complaints bana sakta hoon. Boliye "kal maths padhne ka task bana do".');
      return { action: 'Answered question', summary: 'Answered a general query', reply: answer, data: null };
    }
  }
}

export async function handleCommand(req, res) {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ success: false, error: 'Command text is required' });
  if (text.length > 500) return res.status(400).json({ success: false, error: 'Command is too long (max 500 characters)' });

  // The browser sends its local date so "tomorrow" is correct for the user's timezone.
  const today = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.today) ? req.body.today : serverToday();
  const now = /^\d{2}:\d{2}$/.test(req.body?.now) ? req.body.now : new Date().toTimeString().slice(0, 5);
  const ctx = { today, now, weekday: WEEKDAY_NAMES[new Date(`${today}T00:00:00Z`).getUTCDay()], pendingTasks: store.listTasks('pending') };

  const { raw, source, fallbackReason } = await interpret(text, ctx);
  const { ok, errors, value: intent } = validateIntent(raw);

  // Relative and AM/PM-less times are computed here from the user's clock, not guessed by the AI.
  if (ok && ['CREATE_TASK', 'CREATE_NOTE'].includes(intent.intent)) {
    const rel = relativeDateTime(text, today, now);
    if (rel) Object.assign(intent, rel);
    else intent.time = resolveAmbiguousHour(text, intent.date, intent.time, today, now);
  }

  if (!ok) {
    const lang = intent?.language || 'en';
    const reply = say(lang, "Sorry, I didn't catch enough detail to do that. Could you say it again with a bit more information?", 'Maaf kijiye, poori detail samajh nahi aayi. Thoda detail mein dobara boliye.');
    store.logActivity({ command: text, intent: intent?.intent, summary: `Validation failed: ${errors.join('; ')}`, success: false, source });
    return res.status(422).json({ success: false, intent: intent?.intent, source, fallbackReason, language: lang, reply, error: errors.join('; '), parsed: intent });
  }

  try {
    const result = execute(intent, ctx);
    store.logActivity({ command: text, intent: intent.intent, summary: result.summary, success: !result.failed, source });
    res.json({
      success: !result.failed, intent: intent.intent, source, fallbackReason, language: intent.language,
      action: result.action, reply: result.reply, data: result.data ?? null, parsed: intent,
      requiresConfirmation: result.requiresConfirmation || false, confirm: result.confirm || null,
    });
  } catch (err) {
    console.error('[command] action failed:', err);
    store.logActivity({ command: text, intent: intent.intent, summary: `Action failed: ${err.message}`, success: false, source });
    res.status(500).json({
      success: false, intent: intent.intent, source, language: intent.language, error: err.message,
      reply: say(intent.language, 'Something went wrong while saving that. Nothing was changed, please try again.', 'Kuch gadbad ho gayi, kuch save nahi hua. Dobara try kijiye.'),
    });
  }
}

export function confirmAction(req, res) {
  const { action, taskId, language = 'en' } = req.body || {};
  const lang = ['en', 'hinglish', 'hi'].includes(language) ? language : 'en';
  if (action !== 'DELETE_TASK' || !Number.isInteger(taskId)) {
    return res.status(400).json({ success: false, error: 'Unsupported confirmation request' });
  }
  const task = store.deleteTask(taskId);
  if (!task) {
    return res.status(404).json({ success: false, reply: say(lang, 'That task no longer exists.', 'Yeh task ab exist nahi karta.') });
  }
  store.logActivity({ command: null, intent: 'DELETE_TASK', summary: `Deleted task "${task.title}"`, source: 'confirmed' });
  res.json({
    success: true, intent: 'DELETE_TASK', action: 'Task deleted', language: lang,
    reply: say(lang, `"${task.title}" has been deleted.`, `"${task.title}" delete ho gaya hai.`),
    data: { type: 'task', item: task },
  });
}
