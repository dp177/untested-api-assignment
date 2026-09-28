const service = require('../src/services/taskService');

beforeEach(() => {
  service._reset();
  jest.useRealTimers();
});
afterEach(() => jest.useRealTimers());

const add = (title, options = {}) => service.create({ title, ...options });

describe('taskService lifecycle', () => {
  test('creates unique IDs, defaults, timestamps, and preserves supplied values', () => {
    const first = add('A');
    const second = add('B', { description: 'details', priority: 'high', status: 'in_progress' });
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(first.id).not.toBe(second.id);
    expect(first).toMatchObject({ title: 'A', description: '', status: 'todo', priority: 'medium', dueDate: null, completedAt: null });
    expect(second).toMatchObject({ description: 'details', priority: 'high', status: 'in_progress' });
    expect(new Date(first.createdAt).toISOString()).toBe(first.createdAt);
    expect(service.findById(first.id)).toEqual(first);
    expect(service.findById('missing')).toBeUndefined();
  });

  test('lists tasks in insertion order and returns an independent array', () => {
    add('A'); add('B');
    const snapshot = service.getAll();
    expect(snapshot.map(t => t.title)).toEqual(['A', 'B']);
    snapshot.pop();
    expect(service.getAll()).toHaveLength(2);
  });

  test('filters tasks by status', () => {
    add('todo'); add('active', { status: 'in_progress' }); add('finished', { status: 'done' });
    expect(service.getByStatus('done').map(t => t.title)).toEqual(['finished']);
    expect(service.getByStatus('unmatched')).toEqual([]);
  });

  test('page 1 starts at the first task; later pages and out-of-range pages work', () => {
    ['A', 'B', 'C', 'D', 'E'].forEach(title => add(title));
    expect(service.getPaginated(1, 2).map(t => t.title)).toEqual(['A', 'B']);
    expect(service.getPaginated(2, 2).map(t => t.title)).toEqual(['C', 'D']);
    expect(service.getPaginated(3, 2).map(t => t.title)).toEqual(['E']);
    expect(service.getPaginated(4, 2)).toEqual([]);
  });

  test('stats count status and only overdue unfinished tasks', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    add('past todo', { dueDate: '2026-09-27T00:00:00.000Z' });
    add('past active', { status: 'in_progress', dueDate: '2026-09-28T11:59:59.000Z' });
    add('past done', { status: 'done', dueDate: '2026-09-20T00:00:00.000Z' });
    add('now', { dueDate: '2026-09-28T12:00:00.000Z' });
    add('future', { dueDate: '2026-10-01T00:00:00.000Z' });
    expect(service.getStats()).toEqual({ todo: 3, in_progress: 1, done: 1, overdue: 2 });
  });

  test('updates an existing task, returns null for unknown ID', () => {
    const old = add('old');
    const updated = service.update(old.id, { title: 'new', priority: 'high' });
    expect(updated).toMatchObject({ id: old.id, title: 'new', priority: 'high', description: '' });
    expect(service.findById(old.id)).toEqual(updated);
    expect(service.update('missing', { title: 'new' })).toBeNull();
  });

  test('deletes only the matching task; unknown ID returns false', () => {
    const first = add('first'), second = add('second');
    expect(service.remove(first.id)).toBe(true);
    expect(service.remove(first.id)).toBe(false);
    expect(service.getAll()).toEqual([second]);
  });

  test('completes a task with timestamp, returns null for missing task', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const created = add('finish');
    expect(service.completeTask(created.id)).toMatchObject({ status: 'done', completedAt: '2026-09-28T12:00:00.000Z' });
    expect(service.completeTask('missing')).toBeNull();
    expect(service.findById(created.id).status).toBe('done');
  });

  test('assigns, reassigns and repeats without changing unrelated task fields', () => {
    const original = add('A', { priority: 'high' });
    const assigned = service.assignTask(original.id, 'Daksh');
    expect(assigned).toEqual({ ...original, assignee: 'Daksh' });
    expect(service.assignTask(original.id, 'Daksh')).toBe(assigned);
    expect(service.assignTask(original.id, 'Sam')).toEqual({ ...original, assignee: 'Sam' });
    expect(service.assignTask('missing', 'Daksh')).toBeNull();
  });
});
