// Runs the hackathon's required test commands against a running server and prints the results.
// Usage: npm run test:commands   (API_URL defaults to http://localhost:5000)
const API = process.env.API_URL || 'http://localhost:5000';
const today = new Date().toLocaleDateString('en-CA');

const commands = [
  'Create a task to study mathematics tomorrow.',
  'Show my pending tasks.',
  'Mark my first task as completed.',
  'Create a complaint about the classroom fan.',
  'Save a note about my upcoming examination.',
  'Kal mujhe assignment submit karna hai, ek task bana do.',
  'Mujhe kal 10 baje library jaana hai, reminder laga do.',
  'Summarize my tasks for today.',
  'Delete my last task.',
];

let failures = 0;
for (const text of commands) {
  const res = await fetch(`${API}/api/command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, today }),
  });
  const body = await res.json();
  if (!body.success) failures++;
  const p = body.parsed || {};
  console.log(`\n> ${text}\n  [${res.status}] ${body.intent} via ${body.source}  title=${p.title ?? '-'} date=${p.date ?? '-'} time=${p.time ?? '-'}`);
  console.log(`  ${body.reply}${body.requiresConfirmation ? '  (awaiting confirmation)' : ''}`);
}

const stats = await (await fetch(`${API}/api/stats?today=${today}`)).json();
console.log('\nDB stats:', { tasks: stats.totalTasks, completed: stats.completedTasks, pending: stats.pendingTasks, complaints: stats.totalComplaints, notes: stats.totalNotes });
process.exitCode = failures ? 1 : 0;
