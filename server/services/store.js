// Data-access layer: every function here reads or writes real SQLite rows.
import { db } from '../database/db.js';

const n = (v) => (v === undefined || v === '' ? null : v);

// ---------- Tasks ----------
export function listTasks(filter = 'all', today = null) {
  if (filter === 'pending') {
    return db.prepare(`SELECT * FROM tasks WHERE status = 'pending'
      ORDER BY due_date IS NULL, due_date, due_time IS NULL, due_time, id`).all();
  }
  if (filter === 'completed') {
    return db.prepare(`SELECT * FROM tasks WHERE status = 'completed' ORDER BY completed_at DESC`).all();
  }
  if (filter === 'today' && today) {
    return db.prepare(`SELECT * FROM tasks WHERE due_date = ? ORDER BY status DESC, due_time IS NULL, due_time`).all(today);
  }
  return db.prepare(`SELECT * FROM tasks ORDER BY status DESC, due_date IS NULL, due_date, id DESC`).all();
}

export function getTask(id) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}

export function createTask({ title, description, date, time, priority, category }) {
  const r = db.prepare(`INSERT INTO tasks (title, description, due_date, due_time, priority, category)
    VALUES (?, ?, ?, ?, ?, ?)`).run(title, n(description), n(date), n(time), priority || 'medium', category || 'general');
  return getTask(Number(r.lastInsertRowid));
}

export function setTaskStatus(id, status) {
  const r = db.prepare(`UPDATE tasks SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE NULL END
    WHERE id = ?`).run(status, status, id);
  return r.changes ? getTask(id) : null;
}

export function deleteTask(id) {
  const task = getTask(id);
  if (!task) return null;
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return task;
}

// Pending tasks whose time has arrived today and that have not been announced yet.
export function dueReminders(today, now) {
  return db.prepare(`SELECT * FROM tasks WHERE status = 'pending' AND reminded_at IS NULL
    AND due_date = ? AND due_time IS NOT NULL AND due_time <= ? ORDER BY due_time`).all(today, now);
}

export function markReminded(id) {
  const r = db.prepare(`UPDATE tasks SET reminded_at = datetime('now')
    WHERE id = ? AND reminded_at IS NULL AND status = 'pending'`).run(id);
  return r.changes ? getTask(id) : null;
}

// ---------- Notes ----------
export function listNotes() {
  return db.prepare('SELECT * FROM notes ORDER BY id DESC').all();
}

export function createNote({ title, description, category }) {
  const r = db.prepare('INSERT INTO notes (title, content, category) VALUES (?, ?, ?)')
    .run(title, n(description), category || 'general');
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(Number(r.lastInsertRowid));
}

export function deleteNote(id) {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!note) return null;
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return note;
}

// ---------- Complaints ----------
export function listComplaints() {
  return db.prepare('SELECT * FROM complaints ORDER BY id DESC').all();
}

export function createComplaint({ title, description, category, location, priority }) {
  const r = db.prepare(`INSERT INTO complaints (title, description, category, location, priority)
    VALUES (?, ?, ?, ?, ?)`).run(title, n(description), category || 'general', n(location), priority || 'medium');
  const id = Number(r.lastInsertRowid);
  db.prepare('UPDATE complaints SET ticket_no = ? WHERE id = ?').run(`CMP-${1000 + id}`, id);
  return db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
}

export function setComplaintStatus(id, status) {
  const r = db.prepare('UPDATE complaints SET status = ? WHERE id = ?').run(status, id);
  return r.changes ? db.prepare('SELECT * FROM complaints WHERE id = ?').get(id) : null;
}

// ---------- Activity ----------
export function logActivity({ command = null, intent = null, summary, success = true, source = null }) {
  db.prepare('INSERT INTO activity (command, intent, summary, success, source) VALUES (?, ?, ?, ?, ?)')
    .run(n(command), n(intent), summary, success ? 1 : 0, n(source));
}

export function listActivity(limit = 50) {
  return db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT ?').all(limit);
}

// ---------- Dashboard ----------
export function getStats(today) {
  const one = (sql, ...p) => db.prepare(sql).get(...p).c;
  return {
    totalTasks: one('SELECT COUNT(*) c FROM tasks'),
    completedTasks: one(`SELECT COUNT(*) c FROM tasks WHERE status = 'completed'`),
    pendingTasks: one(`SELECT COUNT(*) c FROM tasks WHERE status = 'pending'`),
    totalComplaints: one('SELECT COUNT(*) c FROM complaints'),
    openComplaints: one(`SELECT COUNT(*) c FROM complaints WHERE status != 'resolved'`),
    totalNotes: one('SELECT COUNT(*) c FROM notes'),
    upcoming: db.prepare(`SELECT * FROM tasks WHERE status = 'pending' AND (due_date IS NULL OR due_date >= ?)
      ORDER BY due_date IS NULL, due_date, due_time IS NULL, due_time LIMIT 5`).all(today),
    recentActivity: listActivity(8),
  };
}
