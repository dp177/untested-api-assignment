const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');
const { seedDemoTasks } = require('../src/demo');

beforeEach(() => service._reset());
afterEach(() => { delete process.env.SEED_DEMO; service._reset(); });

test('root presents links and a clearly labelled demo, not an empty dashboard', async () => {
  const response = await request(app).get('/');
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toMatch(/html/);
  expect(response.text).toContain('GET /tasks');
  expect(response.text).toContain('BUG_REPORT.md');
  expect(response.text).toContain('Sample tasks loaded on this demo');
  expect(response.text).toContain('In-memory data resets');
});

test('demo seeding is opt-in, and never runs merely for tests', () => {
  delete process.env.SEED_DEMO;
  seedDemoTasks();
  expect(service.getAll()).toEqual([]);
});

test('demo records are plainly sample data with representative statuses and do not duplicate', () => {
  process.env.SEED_DEMO = '1';
  seedDemoTasks();
  const seeded = service.getAll();
  expect(seeded.map(t => t.status)).toEqual(['done', 'in_progress', 'todo']);
  expect(seeded[0].completedAt).toEqual(expect.any(String));
  seedDemoTasks();
  expect(service.getAll()).toEqual(seeded);
});

test('does not inject sample data into a non-empty store', () => {
  process.env.SEED_DEMO = '1';
  service.create({ title: 'Existing user task' });
  seedDemoTasks();
  expect(service.getAll().map(t => t.title)).toEqual(['Existing user task']);
});
