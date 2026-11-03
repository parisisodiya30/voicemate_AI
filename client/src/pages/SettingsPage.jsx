import { Volume2, Languages, Zap, User, Cpu, Database, Mic, AudioLines } from 'lucide-react';
import { Card, PageHeader, Badge } from '../components/ui.jsx';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';

function Row({ icon: Icon, title, hint, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10"><Icon className="size-4 text-violet-300" /></div>
        <div>
          <p className="font-semibold text-slate-100">{title}</p>
          {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-violet-600' : 'bg-white/15'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

const selectCls = 'w-full rounded-xl border border-white/10 bg-navy-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:w-64';

export default function SettingsPage({ settings, update, tts, health }) {
  const { supported: sttSupported } = useSpeechRecognition();
  const voices = tts.voices.filter((v) => /^(en|hi)/i.test(v.lang));
  const gemini = health?.integrations?.gemini;

  const integrations = [
    { icon: Mic, name: 'Speech-to-Text', tech: 'Browser Web Speech API', status: sttSupported ? 'live' : 'unavailable', note: sttSupported ? 'Supported in this browser' : 'Not supported here — typing fallback active' },
    { icon: Cpu, name: 'Intent detection', tech: gemini?.status === 'live' ? `Google Gemini (${gemini.model})` : 'Rule-based parser', status: gemini?.status === 'live' ? 'live' : 'fallback', note: gemini?.status === 'live' ? 'Structured JSON, validated on server' : 'Set GEMINI_API_KEY on the server to enable Gemini' },
    { icon: Database, name: 'Database', tech: 'SQLite (server)', status: health ? 'live' : 'unavailable', note: health ? 'All tasks, notes, complaints persisted' : 'Server unreachable' },
    { icon: AudioLines, name: 'Text-to-Speech', tech: 'Browser SpeechSynthesis API', status: tts.supported ? 'live' : 'unavailable', note: tts.supported ? `${tts.voices.length} voices available` : 'Not supported in this browser' },
  ];

  return (
    <>
      <PageHeader title="Settings" subtitle="Preferences are stored on this device. Your data lives in the server database." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="divide-y divide-white/5 px-5 py-1 xl:col-span-3">
          <Row icon={User} title="Your name" hint="Used in the dashboard greeting">
            <input value={settings.userName} onChange={(e) => update({ userName: e.target.value.slice(0, 30) })} placeholder="Your first name" className={selectCls} />
          </Row>
          <Row icon={Languages} title="Recognition language" hint="en-IN understands Hinglish well; hi-IN for Hindi (Devanagari)">
            <select value={settings.recogLang} onChange={(e) => update({ recogLang: e.target.value })} className={selectCls}>
              <option value="en-IN">English (India) / Hinglish</option>
              <option value="hi-IN">हिन्दी — Hindi</option>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
            </select>
          </Row>
          <Row icon={Zap} title="Auto-execute" hint="Run the command as soon as you stop speaking. Turn off to review and edit first.">
            <Toggle checked={settings.autoRun} onChange={(v) => update({ autoRun: v })} label="Auto-execute" />
          </Row>
          <Row icon={Volume2} title="Voice responses" hint="Speak every reply aloud">
            <Toggle checked={settings.voiceEnabled} onChange={(v) => update({ voiceEnabled: v })} label="Voice responses" />
          </Row>
          <Row icon={AudioLines} title="Voice" hint="Auto picks an Indian English or Hindi voice">
            <div className="flex gap-2">
              <select value={settings.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })} className={selectCls}>
                <option value="">Auto</option>
                {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
              <button
                onClick={() => tts.speak('Hi! I am VoiceMate. Aapka kaam, meri zimmedari.', { language: 'hinglish', rate: settings.rate, voiceURI: settings.voiceURI })}
                className="rounded-xl px-3 text-sm font-semibold text-violet-200 ring-1 ring-violet-400/30 hover:bg-violet-500/15"
              >Test</button>
            </div>
          </Row>
          <Row icon={Volume2} title="Speech rate" hint={`${settings.rate.toFixed(1)}×`}>
            <input type="range" min="0.6" max="1.6" step="0.1" value={settings.rate} onChange={(e) => update({ rate: Number(e.target.value) })} className="w-full accent-violet-500 sm:w-64" />
          </Row>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <h2 className="font-bold text-white">Integration status</h2>
          <p className="mt-1 text-xs text-slate-400">What is running live right now versus a fallback.</p>
          <ul className="mt-4 space-y-3">
            {integrations.map(({ icon: Icon, name, tech, status, note }) => (
              <li key={name} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5">
                <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{name}</p>
                    <Badge tone={status === 'live' ? 'green' : status === 'fallback' ? 'amber' : 'red'}>{status}</Badge>
                  </div>
                  <p className="text-xs text-slate-300">{tech}</p>
                  <p className="text-[11px] text-slate-500">{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
