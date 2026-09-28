const express = require('express');
const taskRoutes = require('./routes/tasks');
const { seedDemoTasks } = require('./demo');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Task API | Underpin take-home</title>
<style>
  :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e9edf5;background:#0e1422}
  *{box-sizing:border-box}body{margin:0;padding:clamp(20px,5vw,64px)}main{max-width:850px;margin:0 auto}
  .eyebrow{color:#85dbdb;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
  h1{font-size:clamp(2rem,5vw,3.4rem);letter-spacing:-.04em;margin:.5rem 0}p{line-height:1.65;color:#b9c4d8}
  .badge{display:inline-block;background:#193a3d;color:#a7eeee;border:1px solid #356568;border-radius:99px;padding:.35rem .75rem;font-size:.8rem;font-weight:650}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:30px 0}
  a.card{display:block;padding:22px;border:1px solid #34445d;border-radius:14px;background:#172235;color:#e9edf5;text-decoration:none}
  a.card:hover,a.card:focus-visible{border-color:#85dbdb;outline:none}a.card span{display:block;margin-top:8px;color:#a8b8cf;font-size:.9rem}
  a{color:#85dbdb}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
  pre{background:#090f1c;border:1px solid #34445d;border-radius:12px;padding:18px;white-space:pre-wrap;overflow-wrap:anywhere;color:#c8e8e4;line-height:1.5}
  section{margin-top:38px}small{color:#97a9c2}
</style></head><body><main>
  <div class="eyebrow">Underpin take-home / Node.js + Express</div>
  <h1>The Untested API</h1>
  <p>A small task manager built to demonstrate behavior-first tests, bug investigation, and an assignment feature. This is an API, not a dashboard. The links below return JSON.</p>
  <span class="badge">Sample tasks loaded on this demo</span>
  <div class="cards">
    <a class="card" href="/tasks">GET /tasks<span>See tasks and sample records</span></a>
    <a class="card" href="/tasks/stats">GET /tasks/stats<span>Counts by status and overdue</span></a>
    <a class="card" href="/tasks?status=todo&page=1&limit=10">Filtered tasks<span>Status plus pagination together</span></a>
  </div>
  <section><h2>Try an assignment</h2><p>Use the ID of any task from <a href="/tasks">/tasks</a>:</p>
  <pre>curl -X PATCH https://untested-api-assignment-6u2y.onrender.com/tasks/TASK_ID/assign \
  -H 'Content-Type: application/json' \
  -d '{"assignee":"Alex"}'</pre>
  <p>Other routes: POST /tasks, PUT /tasks/:id, DELETE /tasks/:id, PATCH /tasks/:id/complete.</p></section>
  <section><h2>Tests and reasoning</h2><p><a href="https://github.com/dp177/untested-api-assignment">Source repository</a> · <a href="https://github.com/dp177/untested-api-assignment/blob/main/BUG_REPORT.md">Bug report</a> · <a href="https://github.com/dp177/untested-api-assignment/blob/main/SUBMISSION.md">Submission notes</a></p>
  <small>Public demo only. In-memory data resets on restart; do not enter private information.</small></section>
</main></body></html>`);
});
app.use('/tasks', taskRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  seedDemoTasks();
  app.listen(PORT, () => {
    console.log(`Task API running on port ${PORT}`);
  });
}

module.exports = app;
