import { LayoutDashboard, Mic, ListTodo, StickyNote, MessageSquareWarning, History, Settings, X, Sparkles } from 'lucide-react';

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assistant', label: 'Voice Assistant', icon: Mic },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
  { id: 'activity', label: 'Activity', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
        <Mic className="size-5 text-white" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <p className="font-extrabold tracking-tight text-white">VoiceMate <span className="text-gradient">AI</span></p>
        <p className="text-[11px] text-slate-400">Voice-to-Action Assistant</p>
      </div>
    </div>
  );
}

export default function Sidebar({ page, onNavigate, open, onClose, counts, health }) {
  const gemini = health?.integrations?.gemini;
  return (
    <>
      <div className={`fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-sm transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-navy-950/85 p-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close menu"><X className="size-5" /></button>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id;
            const count = counts?.[id];
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-gradient-to-r from-violet-600/40 to-violet-600/10 text-white ring-1 ring-violet-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}
              >
                <Icon className={`size-[18px] ${active ? 'text-violet-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="flex-1 text-left">{label}</span>
                {count > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="rounded-2xl bg-gradient-to-br from-violet-600/25 to-cyan-500/10 p-4 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Sparkles className="size-4 text-violet-300" /> AI engine</div>
          <p className="mt-1 text-xs text-slate-300">
            {!health ? 'Checking…' : gemini?.status === 'live' ? `Gemini live · ${gemini.model}` : 'Offline rule parser (no Gemini key)'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className={`size-1.5 rounded-full ${!health ? 'bg-slate-500' : gemini?.status === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {health ? 'SQLite connected' : 'Connecting to server'}
          </div>
        </div>
      </aside>
    </>
  );
}
