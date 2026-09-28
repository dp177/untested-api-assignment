const taskService = require('./services/taskService');

// Explicit sample records, never production user data. Only the demo deployment opts in.
const demoTasks = [
  { title: 'Write route tests', description: 'Cover happy paths and invalid requests with Supertest.', priority: 'high', status: 'done' },
  { title: 'Investigate pagination', description: 'Reproduce the off-by-one bug and explain the root cause.', priority: 'high', status: 'in_progress' },
  { title: 'Review assignment endpoint', description: 'Check validation, reassignment, and missing-task behavior.', priority: 'medium', status: 'todo' },
];

function seedDemoTasks() {
  if (process.env.SEED_DEMO !== '1' || taskService.getAll().length) return;
  for (const input of demoTasks) {
    const task = taskService.create(input);
    if (input.status === 'done') taskService.completeTask(task.id);
  }
}

module.exports = { seedDemoTasks };
