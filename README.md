<div align="center">

# 🎙️ VoiceMate AI

### Your Intelligent Voice-to-Action Assistant

**Speak Naturally. Think Intelligently. Get Things Done.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.13+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini-8E75B2?logo=googlegemini&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-built--in-003B57?logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

*Built for **Vocal Labs Round 2 – Voice AI Hackathon***

</div>

---

## 📖 About

**VoiceMate AI** is a voice-powered productivity and campus-assistance app for students.

You **speak** in English, Hindi or Hinglish → **Google Gemini** understands what you mean → the app **performs a real action** in the database (creates a task, sets a reminder, registers a complaint ticket, saves a note) → it **shows the result** on a live dashboard and **speaks the reply** back to you.

It is **not just a chatbot**. Every command changes real data.

```
🎤 You speak  →  📝 Speech-to-Text  →  🧠 Gemini AI (intent + details)
      →  ✅ Validation  →  💾 SQLite action  →  🖥️ UI update  +  🔊 Voice reply
```

---

## ✨ Features

### 🎤 Voice assistant
- Large animated microphone with live "listening" rings and status
- Live transcript you can **edit before running** (or turn on auto-execute)
- Works in **English, Hindi and Hinglish** (`en-IN`, `hi-IN`, `en-US`, `en-GB`)
- **Typing fallback** if the mic is blocked or the browser has no speech support
- One-click example commands for quick demos

### 🧠 AI understanding (Google Gemini)
- Turns natural speech into structured JSON: **intent, title, description, date, time, priority, category, location**
- Understands relative dates and Hinglish: *"kal"* → tomorrow, *"parso shaam 5 baje"* → day after tomorrow 5 PM, *"urgent"* → high priority
- Knows which task you mean: *"mark my **first** task as completed"*, *"mera **doosra** task ho gaya"*
- AI output is **validated** before anything touches the database
- **Backup chain:** if the main Gemini model is busy, a second model is tried, then a built-in offline parser, so the app never stops working

### 💾 Real actions (SQLite database)
| Action | Example command |
|---|---|
| Create a task | *"Create a task to study mathematics tomorrow"* |
| Set a reminder | *"Mujhe kal 10 baje library jaana hai, reminder laga do"* |
| View tasks | *"Show my pending tasks"* |
| Today's summary | *"Summarize my tasks for today"* |
| Complete a task | *"Mark my first task as completed"* |
| Delete a task | *"Delete my last task"* → **asks for confirmation first** |
| Register a complaint (ticket) | *"Create a complaint about the classroom fan"* → ticket **CMP-1001** |
| View complaints | *"Show my complaints"* |
| Save a note | *"Add a note that my exam is on Monday"* |
| View notes | *"Show my notes"* |
| General question | *"What is the capital of France?"* |

### 🔔 Reminder alarm
When a task's time arrives, VoiceMate:
- ⏰ **rings an alarm repeatedly until you close the reminder**
- 🪟 opens a **full-screen popup** with a shaking bell and **Mark done** / **Stop & dismiss**
- 🔊 **always speaks it aloud** (*"Reminder! Drink water. It's time."*)
- 💻 shows a desktop notification and flashes the browser tab title

Each reminder fires **exactly once**, even if you reload the page.

### 🎛️ Interactive UI
- **Live voice pipeline:** Listen → Understand → Act → Speak, with each step lighting up as it runs (red if a step fails)
- **Space bar = push-to-talk:** press Space anywhere to start/stop the mic
- **Animated dashboard:** numbers count up, a completion-rate progress ring, and every stat card is clickable
- **Quick-add forms:** add tasks/reminders, notes and complaints without speaking (same validation as voice)
- **Search and filters:** search tasks, notes and complaints (by ticket, room or issue); filter complaints by status
- **Confetti 🎉** whenever a task is completed

### ⛔ No past scheduling
Asking for a task, reminder or note at a time that has already passed is refused, with a spoken explanation, and **nothing is saved**:
> *"Yeh time nikal chuka hai (aaj 10 AM). Purane time ka reminder set nahi ho sakta, aage ka time boliye."*

### 🔊 Voice replies
Every result is spoken back in English or Roman-script Hinglish using an Indian voice:
> *"Aapki complaint successfully register ho gayi hai. Ticket number hai CMP-1001."*

### 🖥️ Dashboard and pages
| Page | What it shows |
|---|---|
| **Dashboard** | Total / completed / pending tasks, complaints, upcoming tasks, recent activity, and the mic |
| **Voice Assistant** | Full-size mic, examples, AI result cards |
| **Tasks** | Filters (Pending / Today / Completed / All), tick to complete, delete |
| **Notes** | All saved notes |
| **Complaints** | Ticket number, category, priority, location, status (Open → In progress → Resolved) |
| **Activity** | Full history of every command and action |
| **Settings** | Language, auto-execute, voice on/off, voice choice, speech rate, live integration status |

Fully **responsive**: sidebar on desktop, slide-out menu on mobile.

---

## ✅ Hackathon requirements checklist

| Requirement | Status | How |
|---|:---:|---|
| Voice input (mandatory) | ✅ | Web Speech API microphone |
| Speech-to-Text | ✅ | Browser Web Speech API |
| AI understands intent | ✅ | Google Gemini → validated JSON |
| Performs a real action | ✅ | SQLite: create / read / update / delete tasks, notes, complaint tickets |
| Voice output | ✅ | Browser SpeechSynthesis API |
| Shows action and result in UI | ✅ | Result cards, toasts, dashboard, activity log |
| Responsive web app | ✅ | React + Tailwind CSS |
| Public URL | ✅ | Render deployment (see below) |
| Source on GitHub | ✅ | This repository |

---

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, Lucide icons |
| Backend | Node.js 22.13+, Express 5 |
| AI | Google Gemini API (`gemini-3.5-flash-lite`, backup `gemini-flash-lite-latest`) |
| Database | SQLite via Node's built-in `node:sqlite` (no install, no account) |
| Speech-to-Text | Browser Web Speech API |
| Text-to-Speech | Browser SpeechSynthesis API |
| Deployment | Render (single service), optional Vercel for the frontend |

---

## 🚀 How to run (Windows, step by step)

### 1. Install Node.js (one time)
Download the **LTS** version from <https://nodejs.org> and install it. Check it in Command Prompt:
```bash
node -v
```
It must show **v22.13 or higher**.

### 2. Open the project folder
Extract the zip and open the folder that contains `client`, `server` and `package.json`.
> ⚠️ If you see another folder inside, go into it. Commands must run where `package.json` is.

### 3. Open Command Prompt in that folder
Click the folder's address bar, type `cmd`, press **Enter**.

### 4. Install packages (one time, 1–2 minutes)
```bash
npm run install:all
```

### 5. Add your Gemini API key (one time)
1. Get a free key at <https://aistudio.google.com/apikey>.
2. Copy `.env.example`, paste it, and rename the copy to **`.env`**.
3. Open `.env` in Notepad and paste your key:
   ```
   GEMINI_API_KEY=your-key-here
   ```
4. Save.

> No MongoDB or database setup is needed. SQLite creates its file automatically.
> Without a key the app still works, using the offline parser.

### 6. Build (one time, and after code changes)
```bash
npm run build
```

### 7. Start
```bash
npm start
```
You should see:
```
VoiceMate API on http://localhost:5000
  Intent engine: Gemini (gemini-3.5-flash-lite)
```
Keep this window open.

### 8. Open the app
Go to **<http://localhost:5000>** in **Chrome** or **Edge**, click the mic, choose **Allow**, and speak:
> *"Create a task to study mathematics tomorrow"*

**Stop:** press `Ctrl + C`. **Next time:** only steps 3, 7 and 8.

### 🧑‍💻 Developer mode (hot reload)
```bash
npm run dev:server
```
```bash
npm run dev:client
```
Then open <http://localhost:5173>.

### 🧪 Test the required commands
With the server running:
```bash
npm run test:commands --prefix server
```

---

## 🩺 Troubleshooting

| Problem | Fix |
|---|---|
| `Could not read package.json` | You're in the wrong folder. `cd` into the folder that has `package.json`. |
| `'npm' is not recognized` | Install Node.js, then close and reopen Command Prompt. |
| Error mentioning `node:sqlite` | Node.js is too old. Install the latest LTS. |
| Terminal says `rule-based fallback` | `.env` is missing or named `.env.txt`. Turn on **View → File name extensions** and rename it to `.env`. |
| Mic does nothing | Use Chrome/Edge. Click the 🔒 icon in the address bar → allow **Microphone**. |
| No voice / reminder sound | Click anywhere on the page once after opening it (browsers block audio until you interact). |
| No desktop notification | Allow notifications when Chrome asks, or via the 🔒 icon. |
| `port 5000 already in use` | `set PORT=5001 && npm start`, then open <http://localhost:5001>. |

---

## 📁 Project structure

```
voicemate-ai/
├── client/                         # React + Vite frontend
│   ├── src/
│   │   ├── components/             # VoiceAssistant, ReminderAlerts, Sidebar, Items, Toasts, ui
│   │   ├── pages/                  # Dashboard, ListPages (Tasks/Notes/Complaints/Activity), SettingsPage
│   │   ├── hooks/                  # useSpeechRecognition, useSpeechSynthesis, useReminders, useSettings
│   │   ├── services/api.js         # all backend calls
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
├── server/                         # Express backend
│   ├── controllers/
│   │   ├── commandController.js    # voice pipeline: intent → validate → action → reply
│   │   └── dataController.js       # REST endpoints for the UI
│   ├── services/
│   │   ├── gemini.js               # Gemini prompt + model backup chain
│   │   ├── fallbackParser.js       # offline English/Hinglish parser
│   │   ├── intentSchema.js         # validates AI output
│   │   └── store.js                # SQLite queries
│   ├── database/db.js              # schema + migrations
│   ├── routes/api.js
│   ├── scripts/testCommands.js
│   └── server.js                   # also serves the built frontend
├── .env.example
├── render.yaml
├── package.json
└── README.md
```

---

## 🔌 API reference

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/command` | `{ text, today, now }` → intent, action, spoken reply, data |
| `POST` | `/api/command/confirm` | `{ action: "DELETE_TASK", taskId }` confirmed deletion |
| `GET` | `/api/stats` | Dashboard numbers, upcoming tasks, recent activity |
| `GET` | `/api/tasks?filter=` | `pending` / `completed` / `today` / `all` |
| `POST` | `/api/tasks`, `/api/notes`, `/api/complaints` | Quick-add forms (validated, past times refused) |
| `PATCH` | `/api/tasks/:id` | `{ status: "completed" \| "pending" }` |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/reminders/due` | Tasks whose time has arrived |
| `POST` | `/api/tasks/:id/reminded` | Mark a reminder as announced |
| `GET` / `DELETE` | `/api/notes`, `/api/notes/:id` | List / delete notes |
| `GET` / `PATCH` | `/api/complaints`, `/api/complaints/:id` | List / update status |
| `GET` | `/api/activity` | Command and action history |
| `GET` | `/api/health` | Which integrations are live |

---

## 🔐 Security and reliability

- 🔑 Gemini API key stays on the **server only**, loaded from `.env` (git-ignored)
- ✅ AI JSON is **validated** (intent, ISO date, 24h time, priority, title) before any DB write
- ⚠️ **Destructive actions need confirmation** (delete)
- ⛔ Past dates/times are rejected
- 🚦 Rate limit on the AI endpoint (30 requests/min per IP)
- ⏱️ Gemini timeout (8 s) → backup model → offline parser
- 📏 Request size and input length limits; IDs and statuses validated
- 🌐 CORS restricted via `CORS_ORIGIN` in production
- 🙅 Never reports success unless the database write succeeded

### Live vs fallback

| Integration | Status |
|---|---|
| Speech-to-Text | **Live** in Chrome, Edge, Safari. Firefox: typing fallback |
| Gemini AI | **Live** with `GEMINI_API_KEY`; otherwise the offline parser (shown as an "Offline parser" badge) |
| Database | **Live** SQLite |
| Text-to-Speech | **Live** browser voices |

Nothing is mocked.

---

## ☁️ Deployment (Render)

One Render web service serves both the API and the React app, so you get **one public URL**.

1. Push this repo to GitHub.
2. Go to <https://render.com>, click **New +** → **Web Service**, and select the repo.
3. Settings:
   | Field | Value |
   |---|---|
   | Runtime | Node |
   | Build Command | `npm run build` |
   | Start Command | `npm start` |
   | Instance Type | Free |
4. Environment variables:
   | Key | Value |
   |---|---|
   | `NODE_VERSION` | `24.12.0` |
   | `GEMINI_API_KEY` | your key |
   | `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
5. Click **Create Web Service** and wait for **Live**.
6. Check `https://<your-app>.onrender.com/api/health` shows `"gemini": { "status": "live" }`.

**Optional, Vercel frontend + Render backend:** on Vercel set Root Directory = `client` and `VITE_API_URL=https://<your-app>.onrender.com`; on Render set `CORS_ORIGIN=https://<your-app>.vercel.app`.

> ⚠️ **Free-tier storage:** Render's free filesystem is temporary. The SQLite data resets when the service restarts, redeploys, or wakes after ~15 min idle. Open the URL a few minutes before a demo. For permanent data, add a Render Persistent Disk at `/var/data` and set `DB_PATH=/var/data/voicemate.db`.

---

## 🐙 Upload to GitHub

```bash
git init
```
```bash
git add .
```
```bash
git commit -m "VoiceMate AI - Vocal Labs Round 2"
```
```bash
git branch -M main
```
```bash
git remote add origin https://github.com/<your-username>/voicemate-ai.git
```
```bash
git push -u origin main
```

`.env`, `node_modules` and database files are git-ignored, so your key is never uploaded.

---

## 🎬 3-minute demo script

| Time | Action | What to say |
|---|---|---|
| 0:00–0:20 | Show the dashboard | "VoiceMate turns natural speech into real actions for students, in English or Hinglish." |
| 0:20–0:45 | 🎤 *"Create a task to study mathematics tomorrow"* | Transcript → Gemini badge → task card → spoken reply → stats update |
| 0:45–1:05 | 🎤 *"Mujhe 2 minute baad paani peena hai, reminder laga do"* | Hinglish understood, time extracted |
| 1:05–1:20 | 🎤 *"Aaj subah 9 baje gym jaana tha, reminder laga do"* | Refused: "Yeh time nikal chuka hai" |
| 1:20–1:40 | 🎤 *"Create a complaint about the classroom fan"* | Ticket CMP-xxxx, category *electrical* |
| 1:40–2:00 | 🎤 *"Show my pending tasks"* → *"Mark my first task as completed"* | List read aloud, then completed |
| 2:00–2:15 | 🎤 *"Delete my last task"* | Confirmation dialog: safe actions |
| 2:15–2:35 | 🔔 Reminder fires | App speaks, chime, notification, Mark done |
| 2:35–3:00 | Activity + Settings | Every action logged; integration status. "Speech → Gemini → Validation → SQLite → Voice." |

**Tips:** use Chrome and a headset mic, allow the mic beforehand, and click once on the page so audio can play.

---

## 🔮 Future scope

- 📱 Push notifications via a service worker (reminders with the tab closed)
- 👤 User accounts and login
- 📅 Google Calendar sync
- 📧 Email the complaint ticket to the campus admin
- 🌍 More Indian languages (Marathi, Tamil, Bengali…)

---

<div align="center">

**VoiceMate AI** · Made with ❤️ for **Vocal Labs Round 2**

</div>
