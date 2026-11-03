import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Send, Volume2, VolumeX, Sparkles, Bot, Keyboard, CircleCheck, CircleX, Cpu, TriangleAlert, Brain, Database } from 'lucide-react';
import { celebrate } from '../services/celebrate.js';
import { useSpeechRecognition, RECOGNITION_ERRORS } from '../hooks/useSpeechRecognition.js';
import { api } from '../services/api.js';
import { requestNotificationPermission } from '../hooks/useReminders.js';
import { useToast } from './Toasts.jsx';
import { Card, Badge, Spinner, ConfirmDialog } from './ui.jsx';
import { TaskRow, NoteCard, ComplaintCard } from './Items.jsx';

const EXAMPLES = [
  'Create a task to study mathematics tomorrow',
  'Show my pending tasks',
  'Mark my first task as completed',
  'Create a complaint about the classroom fan',
  'Save a note about my upcoming examination',
  'Kal mujhe assignment submit karna hai, ek task bana do',
  'Mujhe kal 10 baje library jaana hai, reminder laga do',
  'Summarize my tasks for today',
];

const STATUS = {
  idle: { label: 'Tap the mic and speak', tone: 'slate' },
  listening: { label: 'Listening…', tone: 'violet' },
  thinking: { label: 'Understanding your command…', tone: 'cyan' },
  speaking: { label: 'Speaking', tone: 'green' },
  error: { label: 'Something went wrong', tone: 'red' },
};

function Equalizer({ bars = 5, className = '' }) {
  return (
    <span className={`inline-flex h-4 items-center gap-0.5 ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="eq-bar h-full w-0.5 rounded-full bg-current" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

const PIPELINE = [
  { label: 'Listen', icon: Mic },
  { label: 'Understand', icon: Brain },
  { label: 'Act', icon: Database },
  { label: 'Speak', icon: Volume2 },
];

// Live view of the voice pipeline: which stage is running, done, or failed.
function Pipeline({ phase, result }) {
  let active = -1;
  let done = -1;
  let failed = -1;
  if (phase === 'listening') active = 0;
  else if (phase === 'thinking') { active = 1; done = 0; }
  else if (phase === 'speaking') { active = 3; done = 2; if (result && !result.success) failed = 2; }
  else if (result) {
    done = 3;
    if (!result.success) failed = 2;
  }

  return (
    <ol className="flex w-full max-w-md items-center" aria-label="Voice pipeline">
      {PIPELINE.map(({ label, icon: Icon }, i) => {
        const state = i === failed ? 'failed' : i === active ? 'active' : i <= done ? 'done' : 'idle';
        const dot = {
          active: 'step-active bg-violet-500 text-white ring-violet-300/60',
          done: 'bg-emerald-500/90 text-white ring-emerald-300/40',
          failed: 'bg-rose-500 text-white ring-rose-300/50',
          idle: 'bg-white/5 text-slate-500 ring-white/10',
        }[state];
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span className={`grid size-9 place-items-center rounded-full ring-2 transition-all duration-300 ${dot}`}>
                <Icon className="size-4" />
              </span>
              <span className={`text-[11px] font-semibold transition-colors ${state === 'idle' ? 'text-slate-500' : state === 'failed' ? 'text-rose-300' : 'text-slate-200'}`}>{label}</span>
            </div>
            {i < PIPELINE.length - 1 && (
              <span className="relative mx-1.5 mb-5 h-0.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-violet-400 transition-all duration-500 ${i < Math.max(done, active) ? 'w-full' : 'w-0'}`} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ResultData({ data }) {
  if (!data) return null;
  if (data.type === 'task') return <ul className="mt-3 rounded-xl bg-white/[0.03] ring-1 ring-white/5"><TaskRow task={data.item} /></ul>;
  if (data.type === 'note') return <div className="mt-3"><NoteCard note={data.item} /></div>;
  if (data.type === 'complaint') return <div className="mt-3"><ComplaintCard complaint={data.item} /></div>;
  if (data.type === 'tasks') {
    return data.items.length ? (
      <ul className="mt-3 max-h-72 divide-y divide-white/5 overflow-y-auto rounded-xl bg-white/[0.03] ring-1 ring-white/5">
        {data.items.map((t, i) => <TaskRow key={t.id} task={t} index={data.filter === 'pending' ? i + 1 : null} />)}
      </ul>
    ) : null;
  }
  if (data.type === 'notes') return <div className="mt-3 grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2">{data.items.map((n) => <NoteCard key={n.id} note={n} />)}</div>;
  if (data.type === 'complaints') return <div className="mt-3 grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2">{data.items.map((c) => <ComplaintCard key={c.id} complaint={c} />)}</div>;
  return null;
}

export default function VoiceAssistant({ settings, tts, onChanged, compact = false }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const inputRef = useRef(null);

  const respond = useCallback((res) => {
    setResult(res);
    if (settings.voiceEnabled && res.reply) {
      setPhase('speaking');
      tts.speak(res.reply, { language: res.language, rate: settings.rate, voiceURI: settings.voiceURI });
    } else {
      setPhase(res.success ? 'idle' : 'error');
    }
  }, [settings, tts]);

  const run = useCallback(async (command) => {
    const cmd = command.trim();
    if (!cmd) return;
    tts.cancel();
    setPhase('thinking');
    setResult(null);
    try {
      const res = await api.command(cmd);
      respond(res);
      if (res.requiresConfirmation && res.confirm) {
        setConfirm({ ...res.confirm, language: res.language });
      } else if (res.success) {
        toast(res.action, 'success');
        if (res.data?.item?.due_time) requestNotificationPermission();
        if (res.intent === 'COMPLETE_TASK') celebrate();
        onChanged?.();
      } else {
        toast(res.reply || res.error, 'error');
      }
    } catch (err) {
      const reply = err.message;
      respond({ success: false, reply, action: 'Request failed', language: 'en' });
      toast(reply, 'error');
    }
  }, [respond, toast, onChanged, tts]);

  const rec = useSpeechRecognition({
    lang: settings.recogLang,
    onFinal: (heard) => {
      setText(heard);
      if (settings.autoRun) run(heard);
      else inputRef.current?.focus();
    },
  });

  // Phase follows the speech engines.
  useEffect(() => { if (rec.listening) setPhase('listening'); }, [rec.listening]);
  useEffect(() => { if (!rec.listening && phase === 'listening') setPhase('idle'); }, [rec.listening, phase]);
  useEffect(() => { if (!tts.speaking && phase === 'speaking') setPhase(result?.success === false ? 'error' : 'idle'); }, [tts.speaking, phase, result]);
  useEffect(() => {
    if (rec.error) {
      setPhase('error');
      toast(RECOGNITION_ERRORS[rec.error] || `Voice error: ${rec.error}`, 'error');
    }
  }, [rec.error, toast]);
  useEffect(() => { if (rec.listening) setText(rec.interim); }, [rec.interim, rec.listening]);

  const toggleMic = () => {
    if (rec.listening) return rec.stop();
    tts.cancel();
    rec.clearError();
    setText('');
    rec.start();
  };

  // Space bar = push-to-talk toggle (ignored while typing or when a dialog is open).
  const toggleRef = useRef(toggleMic);
  toggleRef.current = toggleMic;
  const canToggle = rec.supported && phase !== 'thinking';
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.repeat || !canToggle) return;
      const el = e.target;
      if (el.closest?.('input, textarea, select, button, [contenteditable="true"], [role="dialog"], [role="alertdialog"]')) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canToggle]);

  const doConfirm = async () => {
    setConfirmBusy(true);
    try {
      const res = await api.confirm({ action: confirm.action, taskId: confirm.taskId, language: confirm.language });
      respond(res);
      toast(res.success ? res.action : res.reply, res.success ? 'success' : 'error');
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  const cancelConfirm = () => {
    setConfirm(null);
    const reply = confirm?.language === 'en' ? 'Okay, I did not delete anything.' : 'Theek hai, kuch delete nahi kiya.';
    respond({ success: true, reply, action: 'Deletion cancelled', language: confirm?.language || 'en' });
  };

  const busy = phase === 'thinking';
  const status = rec.error ? { label: RECOGNITION_ERRORS[rec.error] ? 'Voice input unavailable' : 'Voice error', tone: 'red' } : STATUS[phase];

  return (
    <Card className={`relative overflow-hidden ${compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'}`}>
      <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative flex flex-col items-center text-center">
        <Badge tone={status.tone} className="mb-6">
          {phase === 'listening' || phase === 'speaking' ? <Equalizer bars={4} /> : busy ? <Spinner className="size-3" /> : <Sparkles className="size-3" />}
          {status.label}
        </Badge>

        {/* Microphone */}
        <div className="relative grid place-items-center">
          {rec.listening && (
            <>
              <span className="mic-ring absolute inset-0 rounded-full bg-violet-500/40" />
              <span className="mic-ring delay-1 absolute inset-0 rounded-full bg-fuchsia-500/30" />
              <span className="mic-ring delay-2 absolute inset-0 rounded-full bg-cyan-400/25" />
            </>
          )}
          <button
            onClick={toggleMic}
            disabled={!rec.supported || busy}
            aria-label={rec.listening ? 'Stop listening' : 'Start voice command'}
            className={`relative grid place-items-center rounded-full text-white shadow-2xl transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'size-24' : 'size-28 sm:size-32'} ${rec.listening ? 'scale-105 bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-fuchsia-500/50' : 'bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 shadow-violet-600/40 hover:scale-105'}`}
          >
            {busy ? <Spinner className="size-10" /> : rec.listening ? <Square className="size-9 fill-white" /> : <Mic className="size-11" strokeWidth={2.2} />}
          </button>
        </div>

        <p className="mt-5 text-sm text-slate-400">
          {rec.supported
            ? rec.listening ? 'Speak now · tap again to stop' : `English, Hindi or Hinglish · ${settings.recogLang}`
            : 'Voice input is not supported in this browser — type your command below.'}
          {rec.supported && !rec.listening && (
            <span className="ml-2 hidden items-center gap-1 sm:inline-flex">
              · press <kbd className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">Space</kbd> to talk
            </span>
          )}
        </p>

        <div className="mt-5 flex w-full justify-center">
          <Pipeline phase={phase} result={result} />
        </div>

        {/* Transcript / manual input */}
        <form
          className="mt-5 w-full max-w-2xl"
          onSubmit={(e) => { e.preventDefault(); run(text); }}
        >
          <div className={`flex items-end gap-2 rounded-2xl bg-navy-950/60 p-2 ring-1 transition ${rec.listening ? 'ring-violet-400/50' : 'ring-white/10 focus-within:ring-violet-400/50'}`}>
            <Keyboard className="mb-2.5 ml-2 size-4 shrink-0 text-slate-500" />
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(text); } }}
              rows={1}
              maxLength={500}
              placeholder={rec.listening ? 'Listening…' : 'Speak, or type a command…'}
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-left text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
              aria-label="Command text"
            />
            <button
              type="submit"
              disabled={!text.trim() || busy || rec.listening}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
            >
              {busy ? <Spinner className="size-4" /> : <Send className="size-4" />}
              <span className="hidden sm:inline">Execute</span>
            </button>
          </div>
        </form>

        {/* Examples */}
        {!compact && (
          <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setText(ex); run(ex); }}
                disabled={busy || rec.listening}
                className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-white/10 transition hover:bg-violet-500/15 hover:text-white hover:ring-violet-400/30 disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      {busy && (
        <div className="relative mt-6 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/5">
          <Spinner className="size-5 text-cyan-300" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      )}

      {result && !busy && (
        <div className="animate-in relative mt-6 rounded-2xl bg-white/[0.03] p-4 text-left ring-1 ring-white/5 sm:p-5">
          <div className="flex items-start gap-3">
            <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${result.success ? 'bg-gradient-to-br from-violet-500 to-cyan-500' : 'bg-rose-500/80'}`}>
              {result.success ? <Bot className="size-5 text-white" /> : <TriangleAlert className="size-5 text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={result.success ? 'green' : 'red'}>
                  {result.success ? <CircleCheck className="size-3" /> : <CircleX className="size-3" />}
                  {result.action || (result.success ? 'Done' : 'Failed')}
                </Badge>
                {result.intent && <Badge tone="violet">{result.intent}</Badge>}
                {result.source && (
                  <Badge tone={result.source === 'gemini' ? 'cyan' : 'amber'} className="cursor-help" >
                    <Cpu className="size-3" /> <span title={result.fallbackReason || 'Intent detected by Gemini'}>{result.source === 'gemini' ? 'Gemini' : 'Offline parser'}</span>
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-100">{result.reply}</p>
            </div>
            {result.reply && tts.supported && (
              <button
                onClick={() => (tts.speaking ? tts.cancel() : tts.speak(result.reply, { language: result.language, rate: settings.rate, voiceURI: settings.voiceURI }))}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label={tts.speaking ? 'Stop speaking' : 'Replay response'}
              >
                {tts.speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            )}
          </div>
          <ResultData data={result.data} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        danger
        busy={confirmBusy}
        title="Delete this task?"
        message={`"${confirm?.label}" will be permanently removed from your tasks.`}
        confirmLabel="Delete task"
        onConfirm={doConfirm}
        onCancel={cancelConfirm}
      />
    </Card>
  );
}
