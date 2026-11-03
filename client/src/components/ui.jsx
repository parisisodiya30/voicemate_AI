import { LoaderCircle, Inbox, TriangleAlert } from 'lucide-react';
import { localToday } from '../services/api.js';

export function Card({ className = '', children, ...rest }) {
  return <div className={`glass rounded-2xl ${className}`} {...rest}>{children}</div>;
}

const BADGE = {
  violet: 'bg-violet-500/15 text-violet-200 ring-violet-400/30',
  cyan: 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/30',
  green: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  red: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  slate: 'bg-white/5 text-slate-300 ring-white/10',
};

export function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${BADGE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export const priorityTone = (p) => ({ high: 'red', medium: 'amber', low: 'green' }[p] || 'slate');

export function Spinner({ className = 'size-5' }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon = Inbox, title, hint, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}>
      <div className="grid size-12 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
        <Icon className="size-5 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <TriangleAlert className="size-6 text-rose-300" />
      <p className="text-sm text-slate-300">{message}</p>
      {onRetry && <button onClick={onRetry} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/15 hover:bg-white/10">Try again</button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onCancel}>
      <Card className="animate-in w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 ring-1 ring-white/15 hover:bg-white/10">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-rose-500 hover:bg-rose-400' : 'bg-violet-600 hover:bg-violet-500'}`}
          >
            {busy && <Spinner className="size-4" />} {confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ---- formatting helpers ----
export function formatDue(date, time) {
  if (!date && !time) return null;
  let label = '';
  if (date) {
    const diff = Math.round((new Date(`${date}T00:00:00`) - new Date(`${localToday()}T00:00:00`)) / 86400000);
    label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday'
      : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  if (time) {
    const [h, m] = time.split(':').map(Number);
    label += `${label ? ', ' : ''}${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }
  return label;
}

export const isOverdue = (task) => task.status === 'pending' && task.due_date && task.due_date < localToday();

export function timeAgo(sqliteUtc) {
  if (!sqliteUtc) return '';
  const then = new Date(`${sqliteUtc.replace(' ', 'T')}Z`);
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
