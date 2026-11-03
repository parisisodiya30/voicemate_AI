// All backend calls. VITE_API_URL is only needed when the frontend is hosted separately (e.g. Vercel).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const localToday = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the user's timezone
export const localNow = () => new Date().toTimeString().slice(0, 5); // HH:MM in the user's timezone

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    const err = new Error('Cannot reach the VoiceMate server. Check your connection and try again.');
    err.network = true;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.reply) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  stats: () => request(`/stats?today=${localToday()}`),
  command: (text) => request('/command', { method: 'POST', body: { text, today: localToday(), now: localNow() } }),
  confirm: (payload) => request('/command/confirm', { method: 'POST', body: payload }),
  tasks: (filter = 'all') => request(`/tasks?filter=${filter}&today=${localToday()}`),
  createTask: (body) => request('/tasks', { method: 'POST', body: { ...body, today: localToday(), now: localNow() } }),
  createNote: (body) => request('/notes', { method: 'POST', body: { ...body, today: localToday(), now: localNow() } }),
  createComplaint: (body) => request('/complaints', { method: 'POST', body: { ...body, today: localToday(), now: localNow() } }),
  setTaskStatus: (id, status) => request(`/tasks/${id}`, { method: 'PATCH', body: { status } }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  dueReminders: () => request(`/reminders/due?today=${localToday()}&now=${localNow()}`),
  markReminded: (id) => request(`/tasks/${id}/reminded`, { method: 'POST' }),
  notes: () => request('/notes'),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  complaints: () => request('/complaints'),
  setComplaintStatus: (id, status) => request(`/complaints/${id}`, { method: 'PATCH', body: { status } }),
  activity: (limit = 100) => request(`/activity?limit=${limit}`),
};
