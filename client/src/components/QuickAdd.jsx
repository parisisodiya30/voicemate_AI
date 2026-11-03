import { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';
import { Card, Spinner } from './ui.jsx';
import { localToday } from '../services/api.js';

const field = 'w-full rounded-xl border border-white/10 bg-navy-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30 [color-scheme:dark]';
const label = 'mb-1 block text-xs font-semibold text-slate-400';

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${field} pl-9`}
        aria-label={placeholder}
      />
    </label>
  );
}

// Collapsible "add manually" panel. `onSubmit` returns true on success so the form can reset.
function Panel({ title, open, setOpen, children, onSubmit, busy }) {
  return (
    <div className="mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-white"
        >
          <Plus className="size-4 transition-transform group-hover:rotate-90" /> {title}
        </button>
      ) : (
        <Card className="animate-in p-4 sm:p-5">
          <form onSubmit={onSubmit}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-white">{title}</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close form"><X className="size-4" /></button>
            </div>
            {children}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 ring-1 ring-white/15 hover:bg-white/10">Cancel</button>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500 active:scale-95 disabled:opacity-60">
                {busy ? <Spinner className="size-4" /> : <Plus className="size-4" />} Save
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

function useForm(initial, onCreate) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState(initial);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!values.title.trim()) return;
    setBusy(true);
    const ok = await onCreate(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v])));
    setBusy(false);
    if (ok) {
      setValues(initial);
      setOpen(false);
    }
  };
  return { open, setOpen, busy, values, set, submit };
}

export function TaskQuickAdd({ onCreate }) {
  const f = useForm({ title: '', date: '', time: '', priority: 'medium' }, (v) => onCreate({ ...v, category: v.time ? 'reminder' : 'general' }));
  return (
    <Panel title="Add task or reminder" {...f} onSubmit={f.submit}>
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <label className={label} htmlFor="qa-task-title">Title</label>
          <input id="qa-task-title" autoFocus required maxLength={120} value={f.values.title} onChange={f.set('title')} placeholder="e.g. Submit physics assignment" className={field} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="qa-task-date">Date</label>
          <input id="qa-task-date" type="date" min={localToday()} value={f.values.date} onChange={f.set('date')} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="qa-task-time">Time (sets a reminder)</label>
          <input id="qa-task-time" type="time" value={f.values.time} onChange={f.set('time')} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="qa-task-priority">Priority</label>
          <select id="qa-task-priority" value={f.values.priority} onChange={f.set('priority')} className={field}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </Panel>
  );
}

export function NoteQuickAdd({ onCreate }) {
  const f = useForm({ title: '', description: '' }, onCreate);
  return (
    <Panel title="Add note" {...f} onSubmit={f.submit}>
      <div className="grid gap-3">
        <div>
          <label className={label} htmlFor="qa-note-title">Title</label>
          <input id="qa-note-title" autoFocus required maxLength={120} value={f.values.title} onChange={f.set('title')} placeholder="e.g. Exam schedule" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="qa-note-body">Note</label>
          <textarea id="qa-note-body" rows={3} maxLength={1000} value={f.values.description} onChange={f.set('description')} placeholder="Write your note…" className={`${field} resize-y`} />
        </div>
      </div>
    </Panel>
  );
}

export function ComplaintQuickAdd({ onCreate }) {
  const f = useForm({ title: '', description: '', location: '', category: 'general', priority: 'medium' }, onCreate);
  return (
    <Panel title="Register complaint" {...f} onSubmit={f.submit}>
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <label className={label} htmlFor="qa-c-title">Issue</label>
          <input id="qa-c-title" autoFocus required maxLength={120} value={f.values.title} onChange={f.set('title')} placeholder="e.g. Projector not working" className={field} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="qa-c-location">Location</label>
          <input id="qa-c-location" maxLength={80} value={f.values.location} onChange={f.set('location')} placeholder="e.g. Room 204" className={field} />
        </div>
        <div className="sm:col-span-3">
          <label className={label} htmlFor="qa-c-category">Category</label>
          <select id="qa-c-category" value={f.values.category} onChange={f.set('category')} className={field}>
            {['general', 'electrical', 'it', 'maintenance', 'canteen', 'infrastructure'].map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={label} htmlFor="qa-c-priority">Priority</label>
          <select id="qa-c-priority" value={f.values.priority} onChange={f.set('priority')} className={field}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="sm:col-span-6">
          <label className={label} htmlFor="qa-c-desc">Details</label>
          <textarea id="qa-c-desc" rows={2} maxLength={1000} value={f.values.description} onChange={f.set('description')} placeholder="Describe the problem…" className={`${field} resize-y`} />
        </div>
      </div>
    </Panel>
  );
}

export const matches = (q, ...fields) => !q.trim() || fields.some((v) => v && String(v).toLowerCase().includes(q.trim().toLowerCase()));
