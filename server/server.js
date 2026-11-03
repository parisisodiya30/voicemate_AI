import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load server/.env first, then the repo-root .env (first value wins).
dotenv.config({ path: [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')], quiet: true });

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { default: apiRouter } = await import('./routes/api.js');
const { DB_PATH } = await import('./database/db.js');
const { geminiConfigured, geminiModel } = await import('./services/gemini.js');

const app = express();
app.set('trust proxy', 1);

// CORS_ORIGIN: comma-separated list of allowed frontends (e.g. your Vercel URL). Unset = allow all.
const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '10kb' }));

app.use('/api', apiRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production the built React app is served from the same service (single-URL deploy).
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));
}

app.use((err, req, res, _next) => {
  console.error(err);
  const status = err.type === 'entity.parse.failed' ? 400 : err.status || 500;
  res.status(status).json({ success: false, error: status === 400 ? 'Invalid JSON body' : 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`VoiceMate API on http://localhost:${PORT}`);
  console.log(`  SQLite: ${DB_PATH}`);
  console.log(`  Intent engine: ${geminiConfigured() ? `Gemini (${geminiModel()})` : 'rule-based fallback (set GEMINI_API_KEY for Gemini)'}`);
});
