import { Router } from 'express';
import { handleCommand, confirmAction } from '../controllers/commandController.js';
import * as data from '../controllers/dataController.js';

// Minimal in-memory rate limit for the AI endpoint (protects the Gemini quota).
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const recent = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= (Number(process.env.RATE_LIMIT_PER_MIN) || 30)) {
    return res.status(429).json({ success: false, error: 'Too many requests', reply: 'You are going a bit fast. Please wait a moment and try again.' });
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}

const router = Router();

router.get('/health', data.health);
router.get('/stats', data.stats);

router.post('/command', rateLimit, handleCommand);
router.post('/command/confirm', confirmAction);

router.get('/tasks', data.tasks);
router.post('/tasks', data.createTask);
router.post('/notes', data.createNote);
router.post('/complaints', data.createComplaint);
router.patch('/tasks/:id', data.updateTask);
router.delete('/tasks/:id', data.removeTask);
router.post('/tasks/:id/reminded', data.markReminded);
router.get('/reminders/due', data.dueReminders);

router.get('/notes', data.notes);
router.delete('/notes/:id', data.removeNote);

router.get('/complaints', data.complaints);
router.patch('/complaints/:id', data.updateComplaint);

router.get('/activity', data.activity);

export default router;
