import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, WifiOff } from 'lucide-react';
import Sidebar, { Logo } from './components/Sidebar.jsx';
import { ToastProvider, useToast } from './components/Toasts.jsx';
import VoiceAssistant from './components/VoiceAssistant.jsx';
import { PageHeader } from './components/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { TasksPage, NotesPage, ComplaintsPage, ActivityPage } from './pages/ListPages.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { useSettings } from './hooks/useSettings.js';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis.js';
import { useReminders, useRinging, requestNotificationPermission, closeNotification } from './hooks/useReminders.js';
import ReminderAlerts from './components/ReminderAlerts.jsx';
import { api } from './services/api.js';
import { celebrate } from './services/celebrate.js';

const PAGES = ['dashboard', 'assistant', 'tasks', 'notes', 'complaints', 'activity', 'settings'];
const pageFromHash = () => {
  const p = window.location.hash.replace('#/', '');
  return PAGES.includes(p) ? p : 'dashboard';
};

function Shell() {
  const toast = useToast();
  const [settings, updateSettings] = useSettings();
  const tts = useSpeechSynthesis();
  const [page, setPage] = useState(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);

  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [notes, setNotes] = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);
  const tasksLoadedAt = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [h, s, t, n, c, a] = await Promise.all([api.health(), api.stats(), api.tasks('all'), api.notes(), api.complaints(), api.activity()]);
      tasksLoadedAt.current = Date.now();
      setHealth(h); setStats(s); setTasks(t); setNotes(n); setComplaints(c); setActivity(a);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (p) => {
    window.location.hash = `/${p}`;
    setPage(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  // Manual actions from the lists — each hits the API, then refreshes from the database.
  const guard = (fn, success) => async (...args) => {
    try {
      await fn(...args);
      if (success) toast(typeof success === 'function' ? success(...args) : success, 'success');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const toggleTask = guard((t) => {
    if (t.status !== 'completed') celebrate();
    return api.setTaskStatus(t.id, t.status === 'completed' ? 'pending' : 'completed');
  },
    (t) => (t.status === 'completed' ? `Reopened "${t.title}"` : `Completed "${t.title}"`));
  const deleteTask = guard((t) => api.deleteTask(t.id), (t) => `Deleted "${t.title}"`);
  const deleteNote = guard((n) => api.deleteNote(n.id), (n) => `Deleted note "${n.title}"`);
  const setComplaintStatus = guard((c, status) => api.setComplaintStatus(c.id, status), (c, s) => `${c.ticket_no} marked ${s.replace('_', ' ')}`);

  const [reminders, setReminders] = useState([]);
  useReminders((task) => {
    setReminders((r) => (r.some((x) => x.id === task.id) ? r : [...r, { ...task, seenAt: Date.now() }]));
    // Reminders are always spoken, even if voice replies are turned off in Settings.
    tts.speak(`Reminder! ${task.title}. It's time.`, { language: 'hinglish', rate: settings.rate, voiceURI: settings.voiceURI });
    refresh();
  });
  // The alarm rings until every open reminder is closed.
  useRinging(reminders.length > 0);
  const dismissReminder = (task) => {
    tts.cancel();
    closeNotification(task.id);
    setReminders((r) => r.filter((x) => x.id !== task.id));
  };

  // A reminder whose task was completed or deleted any other way (voice, Tasks page,
  // another tab) closes itself, so the alarm stops.
  useEffect(() => {
    if (!tasks || !reminders.length) return;
    // A task missing from the list only counts as deleted if the list was loaded after the alarm started.
    const stillPending = (r) => {
      const t = tasks.find((x) => x.id === r.id);
      return t ? t.status === 'pending' : tasksLoadedAt.current <= r.seenAt;
    };
    const finished = reminders.filter((r) => !stillPending(r));
    if (!finished.length) return;
    finished.forEach((r) => closeNotification(r.id));
    if (finished.length === reminders.length) tts.cancel();
    setReminders((list) => list.filter(stillPending));
  }, [tasks, reminders, tts]);

  // While ringing, re-check the database every few seconds to catch changes made elsewhere.
  useEffect(() => {
    if (!reminders.length) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [reminders.length, refresh]);
  const completeReminder = async (task) => {
    dismissReminder(task);
    await toggleTask({ ...task, status: 'pending' });
  };

  // Manual quick-add forms. Return true on success so the form can reset.
  const create = (fn, message) => async (body) => {
    try {
      const item = await fn(body);
      toast(message(item), 'success');
      if (body.time) requestNotificationPermission();
      await refresh();
      return true;
    } catch (err) {
      toast(err.message, 'error');
      return false;
    }
  };
  const createTask = create(api.createTask, (t) => (t.due_time ? `Reminder set: "${t.title}"` : `Task created: "${t.title}"`));
  const createNote = create(api.createNote, (n) => `Note saved: "${n.title}"`);
  const createComplaint = create(api.createComplaint, (c) => `Complaint ${c.ticket_no} registered`);

  const counts = stats && { tasks: stats.pendingTasks, notes: stats.totalNotes, complaints: stats.openComplaints };
  const listProps = { error, onRetry: refresh, onNavigate: navigate };

  return (
    <div className="min-h-screen">
      <Sidebar page={page} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} counts={counts} health={health} />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-navy-900/70 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Logo />
          <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Open menu"><Menu className="size-5" /></button>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {error && (
            <div className="animate-in mb-6 flex items-center gap-3 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-400/30">
              <WifiOff className="size-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={refresh} className="font-semibold underline-offset-2 hover:underline">Retry</button>
            </div>
          )}

          {page === 'dashboard' && <Dashboard stats={stats} settings={settings} tts={tts} onChanged={refresh} onToggleTask={toggleTask} onNavigate={navigate} />}
          {page === 'assistant' && (
            <>
              <PageHeader title="Voice Assistant" subtitle="Speak or type a command. VoiceMate understands it, acts on it, and talks back." />
              <VoiceAssistant settings={settings} tts={tts} onChanged={refresh} />
            </>
          )}
          {page === 'tasks' && <TasksPage tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} onCreate={createTask} {...listProps} />}
          {page === 'notes' && <NotesPage notes={notes} onDelete={deleteNote} onCreate={createNote} {...listProps} />}
          {page === 'complaints' && <ComplaintsPage complaints={complaints} onStatus={setComplaintStatus} onCreate={createComplaint} {...listProps} />}
          {page === 'activity' && <ActivityPage activity={activity} {...listProps} />}
          {page === 'settings' && <SettingsPage settings={settings} update={updateSettings} tts={tts} health={health} />}

          <ReminderAlerts reminders={reminders} onDone={completeReminder} onDismiss={dismissReminder} />

          <footer className="mt-12 text-center text-xs text-slate-500">VoiceMate AI · Built for Vocal Labs Round 2</footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
