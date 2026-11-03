import { Calendar, CircleCheck, Circle, Trash2, Ticket, MapPin, CircleAlert, ListTodo, StickyNote, MessageSquareWarning, Bot, Mic, Hand, BellRing } from 'lucide-react';
import { Badge, priorityTone, formatDue, isOverdue, timeAgo } from './ui.jsx';

export function TaskRow({ task, onToggle, onDelete, index }) {
  const done = task.status === 'completed';
  const due = formatDue(task.due_date, task.due_time);
  const overdue = isOverdue(task);
  return (
    <li className="animate-in group flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.04]">
      <button
        onClick={() => onToggle?.(task)}
        className="mt-0.5 shrink-0 text-slate-500 transition hover:text-emerald-300"
        aria-label={done ? 'Mark as pending' : 'Mark as completed'}
        disabled={!onToggle}
      >
        {done ? <CircleCheck className="size-5 text-emerald-400" /> : <Circle className="size-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
          {index != null && <span className="mr-1.5 text-slate-500">{index}.</span>}
          {task.title}
        </p>
        {task.description && <p className="mt-0.5 truncate text-xs text-slate-400">{task.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {due && (
            <Badge tone={overdue ? 'red' : 'cyan'}><Calendar className="size-3" />{overdue ? `Overdue · ${due}` : due}</Badge>
          )}
          <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
          {task.category !== 'general' && <Badge tone="violet">{task.category}</Badge>}
        </div>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(task)} className="rounded-lg p-1.5 text-slate-500 opacity-100 transition hover:bg-rose-500/10 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete task">
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}

export function NoteCard({ note, onDelete }) {
  return (
    <div className="animate-in glass group relative rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-white">{note.title}</h3>
        {onDelete && (
          <button onClick={() => onDelete(note)} className="rounded-lg p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" aria-label="Delete note">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {note.content && note.content !== note.title && <p className="mt-2 text-sm leading-relaxed text-slate-300">{note.content}</p>}
      <div className="mt-4 flex items-center justify-between">
        <Badge tone="violet">{note.category}</Badge>
        <span className="text-xs text-slate-500">{timeAgo(note.created_at)}</span>
      </div>
    </div>
  );
}

const COMPLAINT_STATUS = { open: 'amber', in_progress: 'cyan', resolved: 'green' };

export function ComplaintCard({ complaint: c, onStatus }) {
  return (
    <div className="animate-in glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-violet-300"><Ticket className="size-3.5" />{c.ticket_no}</span>
        <Badge tone={COMPLAINT_STATUS[c.status]}>{c.status.replace('_', ' ')}</Badge>
      </div>
      <h3 className="mt-2 font-bold text-white">{c.title}</h3>
      {c.description && c.description !== c.title && <p className="mt-1 text-sm text-slate-400">{c.description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="violet">{c.category}</Badge>
        <Badge tone={priorityTone(c.priority)}>{c.priority}</Badge>
        {c.location && <Badge><MapPin className="size-3" />{c.location}</Badge>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{timeAgo(c.created_at)}</span>
        {onStatus && (
          <select
            value={c.status}
            onChange={(e) => onStatus(c, e.target.value)}
            className="rounded-lg border border-white/10 bg-navy-800 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            aria-label="Complaint status"
          >
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        )}
      </div>
    </div>
  );
}

const INTENT_ICON = {
  CREATE_TASK: ListTodo, VIEW_TASKS: ListTodo, COMPLETE_TASK: CircleCheck, DELETE_TASK: Trash2, REOPEN_TASK: Circle,
  CREATE_NOTE: StickyNote, VIEW_NOTES: StickyNote, DELETE_NOTE: Trash2,
  CREATE_COMPLAINT: MessageSquareWarning, VIEW_COMPLAINTS: MessageSquareWarning, UPDATE_COMPLAINT: MessageSquareWarning,
  GENERAL_QUERY: Bot, REMINDER: BellRing,
};

export function ActivityRow({ item }) {
  const Icon = item.success ? INTENT_ICON[item.intent] || Bot : CircleAlert;
  const voice = item.source === 'gemini' || item.source === 'fallback';
  return (
    <li className="animate-in flex gap-3 py-3">
      <div className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ${item.success ? 'bg-violet-500/10 text-violet-300 ring-violet-400/20' : 'bg-rose-500/10 text-rose-300 ring-rose-400/20'}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">{item.summary}</p>
        {item.command && <p className="mt-0.5 truncate text-xs italic text-slate-400">“{item.command}”</p>}
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">{voice ? <Mic className="size-3" /> : <Hand className="size-3" />}{voice ? `voice · ${item.source}` : item.source || 'manual'}</span>
          <span>·</span>
          <span>{timeAgo(item.created_at)}</span>
        </div>
      </div>
    </li>
  );
}
