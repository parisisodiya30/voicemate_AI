import { useEffect, useRef, useState } from 'react';
import { ListTodo, CircleCheck, Clock, MessageSquareWarning, CalendarClock, History, ArrowRight } from 'lucide-react';
import VoiceAssistant from '../components/VoiceAssistant.jsx';
import { Card, EmptyState, Spinner } from '../components/ui.jsx';
import { TaskRow, ActivityRow } from '../components/Items.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// Animates a number from its previous value to the new one.
function CountUp({ value }) {
  const [shown, setShown] = useState(value ?? 0);
  const shownRef = useRef(shown);
  useEffect(() => {
    if (value == null) return;
    const from = shownRef.current;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 700);
      const n = Math.round(from + (value - from) * (1 - (1 - p) ** 3));
      shownRef.current = n;
      setShown(n);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

function ProgressRing({ percent, className = '' }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className={`-rotate-90 ${className}`} aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * percent) / 100} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
      </defs>
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, accent, sub, onClick, ring }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick?.())}
      className="group relative cursor-pointer overflow-hidden p-5 transition duration-200 hover:-translate-y-1 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-violet-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-[0.98]"
    >
      <div className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br opacity-30 blur-2xl transition-opacity group-hover:opacity-60 ${accent}`} />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        {ring != null ? (
          <div className="relative grid size-10 place-items-center">
            <ProgressRing percent={ring} className="absolute inset-0 size-10" />
            <Icon className="size-4 text-emerald-300" />
          </div>
        ) : (
          <div className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br ${accent} shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6`}>
            <Icon className="size-4 text-white" />
          </div>
        )}
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-white">{value == null ? <Spinner className="size-6 text-slate-500" /> : <CountUp value={value} />}</p>
      <div className="mt-1 flex items-center justify-between">
        {sub ? <p className="text-xs text-slate-500">{sub}</p> : <span />}
        <ArrowRight className="size-3.5 -translate-x-1 text-slate-500 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </Card>
  );
}

export default function Dashboard({ stats, settings, tts, onChanged, onToggleTask, onNavigate }) {
  const rate = stats?.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-300">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
          {greeting()}{settings.userName ? `, ${settings.userName}` : ''} 👋
        </h1>
        <p className="mt-1 text-slate-400">Speak naturally. Think intelligently. <span className="text-gradient font-semibold">Get things done.</span></p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={ListTodo} label="Total tasks" value={stats?.totalTasks} accent="from-violet-500 to-indigo-600" sub={stats ? `${stats.totalNotes} notes saved` : null} onClick={() => onNavigate('tasks')} />
        <StatCard icon={CircleCheck} label="Completed" value={stats?.completedTasks} accent="from-emerald-400 to-teal-600" sub={stats ? `${rate}% completion rate` : null} ring={stats ? rate : null} onClick={() => onNavigate('tasks')} />
        <StatCard icon={Clock} label="Pending" value={stats?.pendingTasks} accent="from-amber-400 to-orange-600" sub={stats?.upcoming?.length ? `${stats.upcoming.length} upcoming` : null} onClick={() => onNavigate('tasks')} />
        <StatCard icon={MessageSquareWarning} label="Complaints" value={stats?.totalComplaints} accent="from-fuchsia-500 to-pink-600" sub={stats ? `${stats.openComplaints} open` : null} onClick={() => onNavigate('complaints')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <VoiceAssistant settings={settings} tts={tts} onChanged={onChanged} compact />
        </div>

        <Card className="flex flex-col p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-white"><CalendarClock className="size-4 text-cyan-300" /> Upcoming tasks</h2>
            <button onClick={() => onNavigate('tasks')} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200">View all <ArrowRight className="size-3" /></button>
          </div>
          {!stats ? <div className="grid flex-1 place-items-center py-10"><Spinner className="text-slate-500" /></div>
            : stats.upcoming.length ? (
              <ul className="-mx-2 divide-y divide-white/5">
                {stats.upcoming.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggleTask} />)}
              </ul>
            ) : <EmptyState icon={CalendarClock} title="Nothing coming up" hint='Try saying "Create a task to study mathematics tomorrow".' />}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-white"><History className="size-4 text-violet-300" /> Recent activity</h2>
          <button onClick={() => onNavigate('activity')} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200">History <ArrowRight className="size-3" /></button>
        </div>
        {!stats ? <div className="grid place-items-center py-10"><Spinner className="text-slate-500" /></div>
          : stats.recentActivity.length ? (
            <ul className="grid divide-y divide-white/5 md:grid-cols-2 md:gap-x-8 md:divide-y-0">
              {stats.recentActivity.map((a) => <ActivityRow key={a.id} item={a} />)}
            </ul>
          ) : <EmptyState icon={History} title="No activity yet" hint="Your voice commands and their results will show up here." />}
      </Card>
    </div>
  );
}
