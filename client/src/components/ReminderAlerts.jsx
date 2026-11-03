import { BellRing, CircleCheck, BellOff } from 'lucide-react';
import { formatDue } from './ui.jsx';

// Full-screen popup shown while reminders are ringing. Ringing stops only when every reminder is closed.
export default function ReminderAlerts({ reminders, onDone, onDismiss }) {
  if (!reminders.length) return null;
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-navy-950/75 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-label="Reminder">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-4 p-4">
        {reminders.map((task) => (
          <div key={task.id} className="animate-in glass relative overflow-hidden rounded-3xl bg-navy-800/90 p-6 text-center ring-2 ring-amber-400/50 sm:p-8">
            <div className="pointer-events-none absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full bg-amber-500/25 blur-3xl" />

            <div className="relative mx-auto grid size-20 place-items-center">
              <span className="mic-ring absolute inset-0 rounded-full bg-amber-400/40" />
              <span className="mic-ring delay-1 absolute inset-0 rounded-full bg-orange-500/30" />
              <div className="relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-500/40">
                <BellRing className="bell-shake size-9 text-white" />
              </div>
            </div>

            <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">⏰ Reminder</p>
            <h2 className="relative mt-2 text-2xl font-extrabold text-white">{task.title}</h2>
            <p className="relative mt-1 text-sm text-slate-300">{formatDue(task.due_date, task.due_time)}</p>
            {task.description && <p className="relative mt-2 text-sm text-slate-400">{task.description}</p>}

            <div className="relative mt-6 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => onDismiss(task)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 ring-1 ring-white/20 transition hover:bg-white/10"
              >
                <BellOff className="size-4" /> Stop &amp; dismiss
              </button>
              <button
                onClick={() => onDone(task)}
                autoFocus
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                <CircleCheck className="size-4" /> Mark done
              </button>
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-slate-400">The alarm keeps ringing until you close this reminder.</p>
      </div>
    </div>
  );
}
