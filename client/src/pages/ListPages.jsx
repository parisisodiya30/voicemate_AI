import { useMemo, useState } from 'react';
import { ListTodo, StickyNote, MessageSquareWarning, History, Mic } from 'lucide-react';
import { Card, EmptyState, ErrorState, PageHeader, Spinner, ConfirmDialog } from '../components/ui.jsx';
import { TaskRow, NoteCard, ComplaintCard, ActivityRow } from '../components/Items.jsx';
import { localToday } from '../services/api.js';
import { TaskQuickAdd, NoteQuickAdd, ComplaintQuickAdd, SearchBox, matches } from '../components/QuickAdd.jsx';

const VoiceButton = ({ onNavigate }) => (
  <button onClick={() => onNavigate('assistant')} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500">
    <Mic className="size-4" /> Add by voice
  </button>
);

function Loading() {
  return <div className="grid place-items-center py-16"><Spinner className="size-6 text-slate-500" /></div>;
}

export function TasksPage({ tasks, error, onRetry, onToggle, onDelete, onNavigate, onCreate }) {
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const today = localToday();

  const shown = useMemo(() => {
    if (!tasks) return null;
    let list = tasks;
    if (filter === 'pending') list = tasks.filter((t) => t.status === 'pending');
    else if (filter === 'completed') list = tasks.filter((t) => t.status === 'completed');
    else if (filter === 'today') list = tasks.filter((t) => t.due_date === today);
    return list.filter((t) => matches(query, t.title, t.description, t.category));
  }, [tasks, filter, today, query]);

  const counts = tasks && {
    pending: tasks.filter((t) => t.status === 'pending').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    today: tasks.filter((t) => t.due_date === today).length,
    all: tasks.length,
  };

  return (
    <>
      <PageHeader title="Tasks" subtitle="Everything you've asked VoiceMate to remember." actions={<VoiceButton onNavigate={onNavigate} />} />
      <TaskQuickAdd onCreate={onCreate} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1 ring-1 ring-white/10 sm:inline-flex">
        {['pending', 'today', 'completed', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition ${filter === f ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {f} {counts && <span className="ml-1 text-xs opacity-70">{counts[f]}</span>}
          </button>
        ))}
      </div>
      <SearchBox value={query} onChange={setQuery} placeholder="Search tasks…" />
      </div>
      <Card className="p-2 sm:p-3">
        {error ? <ErrorState message={error} onRetry={onRetry} />
          : !shown ? <Loading />
            : shown.length ? (
              <ul className="divide-y divide-white/5">
                {shown.map((t, i) => <TaskRow key={t.id} task={t} index={filter === 'pending' && !query.trim() ? i + 1 : null} onToggle={onToggle} onDelete={setPendingDelete} />)}
              </ul>
            ) : query.trim() ? <EmptyState icon={ListTodo} title="No matching tasks" hint={`Nothing matches "${query}".`} />
              : <EmptyState icon={ListTodo} title={`No ${filter === 'all' ? '' : filter} tasks`} hint='Say "Create a task to complete my assignment tomorrow".' />}
      </Card>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        danger
        title="Delete this task?"
        message={`"${pendingDelete?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => { await onDelete(pendingDelete); setPendingDelete(null); }}
      />
    </>
  );
}

export function NotesPage({ notes, error, onRetry, onDelete, onNavigate, onCreate }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState('');
  const shown = notes?.filter((n) => matches(query, n.title, n.content, n.category));
  return (
    <>
      <PageHeader title="Notes" subtitle="Quick thoughts captured by voice." actions={<VoiceButton onNavigate={onNavigate} />} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <NoteQuickAdd onCreate={onCreate} />
        {notes?.length > 0 && <div className="mb-4"><SearchBox value={query} onChange={setQuery} placeholder="Search notes…" /></div>}
      </div>
      {error ? <Card><ErrorState message={error} onRetry={onRetry} /></Card>
        : !notes ? <Loading />
          : shown.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((n) => <NoteCard key={n.id} note={n} onDelete={setPendingDelete} />)}
            </div>
          ) : notes.length ? <Card><EmptyState icon={StickyNote} title="No matching notes" hint={`Nothing matches "${query}".`} /></Card>
            : <Card><EmptyState icon={StickyNote} title="No notes yet" hint='Say "Add a note that my exam is on Monday".' /></Card>}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        danger
        title="Delete this note?"
        message={`"${pendingDelete?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => { await onDelete(pendingDelete); setPendingDelete(null); }}
      />
    </>
  );
}

export function ComplaintsPage({ complaints, error, onRetry, onStatus, onNavigate, onCreate }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const shown = complaints?.filter((c) => (status === 'all' || c.status === status)
    && matches(query, c.title, c.description, c.ticket_no, c.location, c.category));
  return (
    <>
      <PageHeader title="Complaints" subtitle="Campus issues you've reported, with ticket numbers." actions={<VoiceButton onNavigate={onNavigate} />} />
      <ComplaintQuickAdd onCreate={onCreate} />
      {complaints?.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1 ring-1 ring-white/10 sm:inline-flex">
            {[['all', 'All'], ['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved']].map(([key, text]) => (
              <button key={key} onClick={() => setStatus(key)}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${status === key ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                {text} <span className="ml-1 text-xs opacity-70">{key === 'all' ? complaints.length : complaints.filter((c) => c.status === key).length}</span>
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Search ticket, issue, room…" />
        </div>
      )}
      {error ? <Card><ErrorState message={error} onRetry={onRetry} /></Card>
        : !complaints ? <Loading />
          : shown.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((c) => <ComplaintCard key={c.id} complaint={c} onStatus={onStatus} />)}
            </div>
          ) : complaints.length ? <Card><EmptyState icon={MessageSquareWarning} title="No matching complaints" hint="Try a different filter or search." /></Card>
            : <Card><EmptyState icon={MessageSquareWarning} title="No complaints filed" hint='Say "Create a complaint about the classroom projector".' /></Card>}
    </>
  );
}

export function ActivityPage({ activity, error, onRetry }) {
  return (
    <>
      <PageHeader title="Activity history" subtitle="Every command and action, as recorded in the database." />
      <Card className="px-5 py-2">
        {error ? <ErrorState message={error} onRetry={onRetry} />
          : !activity ? <Loading />
            : activity.length ? (
              <ul className="divide-y divide-white/5">{activity.map((a) => <ActivityRow key={a.id} item={a} />)}</ul>
            ) : <EmptyState icon={History} title="No activity yet" hint="Run your first voice command to see it here." />}
      </Card>
    </>
  );
}
