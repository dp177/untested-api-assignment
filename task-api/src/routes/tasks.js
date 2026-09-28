const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateCreateTask, validateUpdateTask } = require('../utils/validators');

router.get('/stats', (req, res) => {
  const stats = taskService.getStats();
  res.json(stats);
});

router.get('/', (req, res) => {
  const { status, page, limit } = req.query;

  if (status !== undefined && !['todo', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'status must be one of: todo, in_progress, done' });
  }
  if ((page !== undefined && !/^[1-9]\d*$/.test(page)) ||
      (limit !== undefined && !/^[1-9]\d*$/.test(limit))) {
    return res.status(400).json({ error: 'page and limit must be positive integers' });
  }
  const pageNum = page === undefined ? 1 : Number(page);
  const limitNum = limit === undefined ? 10 : Number(limit);
  if (!Number.isSafeInteger(pageNum) || !Number.isSafeInteger(limitNum)) {
    return res.status(400).json({ error: 'page and limit must be safe integers' });
  }
  const tasks = status === undefined ? taskService.getAll() : taskService.getByStatus(status);
  if (page !== undefined || limit !== undefined) {
    return res.json(tasks.slice((pageNum - 1) * limitNum, pageNum * limitNum));
  }
  res.json(tasks);
});

router.post('/', (req, res) => {
  const error = validateCreateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.create(req.body);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const error = validateUpdateTask(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const task = taskService.update(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

router.delete('/:id', (req, res) => {
  const deleted = taskService.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.status(204).send();
});

router.patch('/:id/complete', (req, res) => {
  const task = taskService.completeTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

router.patch('/:id/assign', (req, res) => {
  const { assignee } = req.body || {};
  if (typeof assignee !== 'string' || !assignee.trim()) {
    return res.status(400).json({ error: 'assignee must be a non-empty string' });
  }

  const task = taskService.assignTask(req.params.id, assignee.trim());
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

module.exports = router;
