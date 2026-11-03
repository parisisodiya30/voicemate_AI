// SQLite via Node's built-in `node:sqlite` module (Node >= 22.13) — no native build step needed.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'voicemate.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT,
    due_date     TEXT,
    due_time     TEXT,
    priority     TEXT NOT NULL DEFAULT 'medium',
    category     TEXT NOT NULL DEFAULT 'general',
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    content    TEXT,
    category   TEXT NOT NULL DEFAULT 'general',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no   TEXT UNIQUE,
    title       TEXT NOT NULL,
    description TEXT,
    category    TEXT NOT NULL DEFAULT 'general',
    location    TEXT,
    priority    TEXT NOT NULL DEFAULT 'medium',
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    command    TEXT,
    intent     TEXT,
    summary    TEXT NOT NULL,
    success    INTEGER NOT NULL DEFAULT 1,
    source     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration for databases created before reminders existed.
if (!db.prepare('PRAGMA table_info(tasks)').all().some((c) => c.name === 'reminded_at')) {
  db.exec('ALTER TABLE tasks ADD COLUMN reminded_at TEXT');
}
