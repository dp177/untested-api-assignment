const request = require('supertest');
const app = require('../src/app');
const service = require('../src/services/taskService');

beforeEach(() => {
  service._reset();
  jest.useRealTimers();
});
afterEach(() => jest.useRealTimers());

async function create(payload = { title: 'Write tests' }) {
  return request(app).post('/tasks').send(payload);
}

describe('POST /tasks', () => {
  test('creates a task with defaults and supplied fields', async () => {
    const res = await create({ title: 'Write tests', priority: 'high', dueDate: '2026-10-01T00:00:00.000Z' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Write tests', status: 'todo', priority: 'high', dueDate: '2026-10-01T00:00:00.000Z', completedAt: null });
    expect(service.findById(res.body.id)).toEqual(res.body);
  });
  test.each([{}, { title: '   ' }, { title: 12 }, { title: 'x', status: 'blocked' }, { title: 'x', priority: 'urgent' }, { title: 'x', dueDate: 'not a date' }])('rejects invalid payload %p', async payload => {
    const res = await create(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(service.getAll()).toHaveLength(0);
  });
});

describe('GET /tasks and /tasks/stats', () => {
  test('lists all tasks, filters status and pages from 1', async () => {
    await create({ title: 'A' });
    await create({ title: 'B', status: 'done' });
    await create({ title: 'C' });
    expect((await request(app).get('/tasks')).body.map(t => t.title)).toEqual(['A', 'B', 'C']);
    expect((await request(app).get('/tasks?status=done')).body.map(t => t.title)).toEqual(['B']);
    expect((await request(app).get('/tasks?status=missing')).status).toBe(400);
    expect((await request(app).get('/tasks?page=1&limit=2')).body.map(t => t.title)).toEqual(['A', 'B']);
    expect((await request(app).get('/tasks?page=2&limit=2')).body.map(t => t.title)).toEqual(['C']);
  });
  test('empty list and out-of-range page are arrays', async () => {
    expect((await request(app).get('/tasks')).body).toEqual([]);
    expect((await request(app).get('/tasks?page=7&limit=2')).body).toEqual([]);
    expect((await request(app).get('/tasks/stats')).body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });
  test('stats track status and overdue after completion', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const past = (await create({ title: 'Past', dueDate: '2026-09-01T00:00:00.000Z' })).body;
    await create({ title: 'Future', status: 'in_progress', dueDate: '2026-10-01T00:00:00.000Z' });
    expect((await request(app).get('/tasks/stats')).body).toEqual({ todo: 1, in_progress: 1, done: 0, overdue: 1 });
    await request(app).patch(`/tasks/${past.id}/complete`);
    expect((await request(app).get('/tasks/stats')).body).toEqual({ todo: 0, in_progress: 1, done: 1, overdue: 0 });
  });
});

describe('PUT /tasks/:id', () => {
  test('updates an existing task', async () => {
    const old = (await create()).body;
    const res = await request(app).put(`/tasks/${old.id}`).send({ title: 'Revised', priority: 'low' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: old.id, title: 'Revised', priority: 'low' });
  });
  test('rejects bad title, status, priority, and due date', async () => {
    const old = (await create()).body;
    for (const data of [{ title: '' }, { status: 'unknown' }, { priority: 'extreme' }, { dueDate: 'nope' }]) {
      expect((await request(app).put(`/tasks/${old.id}`).send(data)).status).toBe(400);
    }
    expect(service.findById(old.id)).toEqual(old);
  });
  test('unknown ID returns 404', async () => {
    expect((await request(app).put('/tasks/missing').send({ title: 'New' })).status).toBe(404);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes existing task with empty 204, then returns 404', async () => {
    const task = (await create()).body;
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).delete(`/tasks/${task.id}`)).status).toBe(404);
    expect((await request(app).get('/tasks')).body).toEqual([]);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('completes an existing task, not a missing one', async () => {
    const task = (await create()).body;
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).toEqual(expect.any(String));
    expect((await request(app).patch('/tasks/missing/complete')).status).toBe(404);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  test('assigns and trims a name, keeping task metadata intact', async () => {
    const old = (await create({ title: 'A', priority: 'high' })).body;
    const res = await request(app).patch(`/tasks/${old.id}/assign`).send({ assignee: '  Daksh Patel  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...old, assignee: 'Daksh Patel' });
    expect((await request(app).get('/tasks')).body[0].assignee).toBe('Daksh Patel');
  });
  test('reassigns existing task and accepts an unchanged repeat', async () => {
    const id = (await create()).body.id;
    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Daksh' });
    expect((await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Sam' })).body.assignee).toBe('Sam');
    expect((await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Sam' })).body.assignee).toBe('Sam');
  });
  test.each([{}, { assignee: '' }, { assignee: '   ' }, { assignee: null }, { assignee: 5 }, { assignee: [] }])('rejects invalid assignee %p without mutation', async payload => {
    const task = (await create()).body;
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
    expect(service.findById(task.id)).toEqual(task);
  });
  test('returns 404 for missing task with valid assignee', async () => {
    const res = await request(app).patch('/tasks/missing/assign').send({ assignee: 'Daksh' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('additional regressions from the bug report', () => {
  test('status matching is exact; invalid status is rejected', async () => {
    await create({ title: 'Working', status: 'in_progress' });
    expect((await request(app).get('/tasks?status=in_progress')).body).toHaveLength(1);
    expect((await request(app).get('/tasks?status=progress')).status).toBe(400);
  });
  test('status filter and pagination compose; invalid page/limit are rejected', async () => {
    await create({ title: 'A' });
    await create({ title: 'B', status: 'done' });
    await create({ title: 'C' });
    expect((await request(app).get('/tasks?status=todo&page=1&limit=1')).body.map(t => t.title)).toEqual(['A']);
    expect((await request(app).get('/tasks?status=todo&page=2&limit=1')).body.map(t => t.title)).toEqual(['C']);
    for (const query of ['page=0', 'page=-1', 'page=1oops', 'limit=0', 'limit=abc', 'page=999999999999999999999']) {
      expect((await request(app).get(`/tasks?${query}`)).status).toBe(400);
    }
  });
  test('completion preserves priority and completedAt on repeated request', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const old = (await create({ title: 'Urgent', priority: 'high' })).body;
    const once = (await request(app).patch(`/tasks/${old.id}/complete`)).body;
    jest.setSystemTime(new Date('2026-09-29T12:00:00.000Z'));
    const twice = (await request(app).patch(`/tasks/${old.id}/complete`)).body;
    expect(once).toMatchObject({ priority: 'high', completedAt: '2026-09-28T12:00:00.000Z' });
    expect(twice).toEqual(once);
  });
  test('update protects server-owned fields and tracks status transitions', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const old = (await create()).body;
    const done = (await request(app).put(`/tasks/${old.id}`).send({ id: 'wrong', createdAt: '2000-01-01', completedAt: '1999-01-01', assignee: 'forged', status: 'done' })).body;
    expect(done).toMatchObject({ id: old.id, createdAt: old.createdAt, status: 'done', completedAt: '2026-09-28T12:00:00.000Z' });
    expect(done).not.toHaveProperty('assignee');
    const reopened = (await request(app).put(`/tasks/${old.id}`).send({ status: 'todo' })).body;
    expect(reopened.completedAt).toBeNull();
    expect(reopened.id).toBe(old.id);
  });
  test('date validation enforces ISO datetimes rather than loosely parsed strings', async () => {
    expect((await create({ title: 'A', dueDate: 'January 1, 2000' })).status).toBe(400);
    expect((await create({ title: 'A', dueDate: 0 })).status).toBe(400);
    expect((await create({ title: 'A', dueDate: '2026-10-01T00:00:00.000Z' })).status).toBe(201);
  });
});
