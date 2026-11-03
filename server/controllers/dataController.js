// REST endpoints used by the dashboard and the manual buttons on each list.
import * as store from '../services/store.js';
import { geminiConfigured, geminiModel } from '../services/gemini.js';
import { validateIntent } from '../services/intentSchema.js';

// Manual "quick add" forms reuse the same validation as voice commands.
function validated(req, res, intent) {
  const { ok, errors, value } = validateIntent({ ...req.body, intent });
  if (!ok) {
    res.status(400).json({ error: errors.join('; ') });
    return null;
  }
  const todayStr = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.today) ? req.body.today : today(req);
  const now = /^\d{2}:\d{2}$/.test(req.body?.now) ? req.body.now : new Date().toTimeString().slice(0, 5);
  const date = value.date || (intent === 'CREATE_TASK' && value.time ? todayStr : null);
  if (date && (date < todayStr || (date === todayStr && value.time && value.time < now))) {
    res.status(400).json({ error: 'That date/time has already passed. Please choose a future time.' });
    return null;
  }
  return { ...value, date };
}

export const createTask = (req, res) => {
  const v = validated(req, res, 'CREATE_TASK');
  if (!v) return;
  const task = store.createTask(v);
  store.logActivity({ intent: 'CREATE_TASK', summary: `Created task "${task.title}"`, source: 'manual' });
  res.status(201).json(task);
};

export const createNote = (req, res) => {
  const v = validated(req, res, 'CREATE_NOTE');
  if (!v) return;
  const note = store.createNote(v);
  store.logActivity({ intent: 'CREATE_NOTE', summary: `Saved note "${note.title}"`, source: 'manual' });
  res.status(201).json(note);
};

export const createComplaint = (req, res) => {
  const v = validated(req, res, 'CREATE_COMPLAINT');
  if (!v) return;
  const c = store.createComplaint(v);
  store.logActivity({ intent: 'CREATE_COMPLAINT', summary: `Registered complaint ${c.ticket_no}: "${c.title}"`, source: 'manual' });
  res.status(201).json(c);
};

const today = (req) => (/^\d{4}-\d{2}-\d{2}$/.test(req.query.today) ? req.query.today : new Date().toISOString().slice(0, 10));
const idParam = (req) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const health = (req, res) => res.json({
  ok: true,
  integrations: {
    gemini: geminiConfigured() ? { status: 'live', model: geminiModel() } : { status: 'fallback', note: 'GEMINI_API_KEY not set; rule-based parser in use' },
    database: { status: 'live', engine: 'SQLite (node:sqlite)' },
  },
});

export const stats = (req, res) => res.json(store.getStats(today(req)));

export const tasks = (req, res) => {
  const filter = ['pending', 'completed', 'today', 'all'].includes(req.query.filter) ? req.query.filter : 'all';
  res.json(store.listTasks(filter, today(req)));
};

export const updateTask = (req, res) => {
  const id = idParam(req);
  const { status } = req.body || {};
  if (!id || !['pending', 'completed'].includes(status)) return res.status(400).json({ error: 'Invalid task id or status' });
  const task = store.setTaskStatus(id, status);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  store.logActivity({ intent: status === 'completed' ? 'COMPLETE_TASK' : 'REOPEN_TASK', summary: `${status === 'completed' ? 'Completed' : 'Reopened'} task "${task.title}"`, source: 'manual' });
  res.json(task);
};

export const removeTask = (req, res) => {
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid task id' });
  const task = store.deleteTask(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  store.logActivity({ intent: 'DELETE_TASK', summary: `Deleted task "${task.title}"`, source: 'manual' });
  res.json(task);
};

export const dueReminders = (req, res) => {
  const now = /^\d{2}:\d{2}$/.test(req.query.now) ? req.query.now : new Date().toISOString().slice(11, 16);
  res.json(store.dueReminders(today(req), now));
};

export const markReminded = (req, res) => {
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid task id' });
  const task = store.markReminded(id);
  if (!task) return res.status(404).json({ error: 'Task not found or already reminded' });
  store.logActivity({ intent: 'REMINDER', summary: `Reminder alert: "${task.title}"`, source: 'reminder' });
  res.json(task);
};

export const notes = (req, res) => res.json(store.listNotes());

export const removeNote = (req, res) => {
  const id = idParam(req);
  if (!id) return res.status(400).json({ error: 'Invalid note id' });
  const note = store.deleteNote(id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  store.logActivity({ intent: 'DELETE_NOTE', summary: `Deleted note "${note.title}"`, source: 'manual' });
  res.json(note);
};

export const complaints = (req, res) => res.json(store.listComplaints());

export const updateComplaint = (req, res) => {
  const id = idParam(req);
  const { status } = req.body || {};
  if (!id || !['open', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid complaint id or status' });
  const c = store.setComplaintStatus(id, status);
  if (!c) return res.status(404).json({ error: 'Complaint not found' });
  store.logActivity({ intent: 'UPDATE_COMPLAINT', summary: `Complaint ${c.ticket_no} marked ${status.replace('_', ' ')}`, source: 'manual' });
  res.json(c);
};

export const activity = (req, res) => res.json(store.listActivity(Math.min(Number(req.query.limit) || 50, 200)));
