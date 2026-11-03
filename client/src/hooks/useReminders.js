import { useEffect, useRef } from 'react';
import { api } from '../services/api.js';

const POLL_MS = 15000;
const RING_EVERY_MS = 2000;

// Asks for desktop-notification permission. Call it from a user action (e.g. after creating a timed task).
export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

// One shared AudioContext, unlocked on the first click/tap (browsers block audio before any interaction).
let audioCtx = null;
function getAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}
if (typeof window !== 'undefined') {
  const unlock = () => getAudio();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

// Alarm-style ring: three quick two-tone beeps, built with Web Audio (no audio file needed).
export function ring() {
  const ctx = getAudio();
  if (!ctx) return;
  try {
    for (let i = 0; i < 3; i++) {
      [988, 1319].forEach((freq, j) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.32 + j * 0.13;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
      });
    }
  } catch {
    /* audio unavailable */
  }
}

// Rings repeatedly and flashes the tab title while `active` is true.
export function useRinging(active) {
  useEffect(() => {
    if (!active) return;
    const original = document.title;
    let flip = false;
    ring();
    const id = setInterval(() => {
      ring();
      flip = !flip;
      document.title = flip ? '⏰ Reminder!' : original;
    }, RING_EVERY_MS);
    return () => {
      clearInterval(id);
      document.title = original;
    };
  }, [active]);
}

// Desktop notifications by task id, so they can be closed when the reminder is closed.
const notifications = new Map();
export function closeNotification(taskId) {
  notifications.get(taskId)?.close();
  notifications.delete(taskId);
}

// Polls the server for tasks whose time has arrived. The server marks each one as reminded,
// so a reminder fires exactly once even across page reloads. Works while the app tab is open.
export function useReminders(onDue) {
  const onDueRef = useRef(onDue);
  onDueRef.current = onDue;

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const due = await api.dueReminders();
        for (const task of due) {
          if (stopped) return;
          // Only the check that successfully claims the reminder announces it (no duplicates,
          // and nothing for a task completed in the meantime).
          const claimed = await api.markReminded(task.id).catch(() => null);
          if (!claimed) continue;
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              notifications.set(task.id, new Notification('⏰ VoiceMate reminder', { body: task.title, icon: '/favicon.svg', tag: `task-${task.id}`, requireInteraction: true }));
            } catch {
              /* some browsers only allow notifications from a service worker */
            }
          }
          onDueRef.current?.(claimed);
        }
      } catch {
        /* server unreachable; try again next tick */
      }
    };
    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);
}
