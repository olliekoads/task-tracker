import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/tasks - List tasks with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, category, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND priority = $${paramCount++}`;
      params.push(priority);
    }
    if (category) {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }
    
    query += ` ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      created_at DESC
      LIMIT $${paramCount}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id - Get specific task
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create task
router.post('/', async (req, res) => {
  try {
    const { title, description, status = 'todo', priority = 'medium', category, tags = [] } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, priority, category, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, status, priority, category, tags, req.user.email]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, category, tags, note } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      params.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      params.push(priority);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      params.push(category);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      params.push(tags);
    }
    
    updates.push(`updated_at = NOW()`);
    
    // Add note to activity log if provided
    if (note) {
      updates.push(`notes = notes || $${paramCount++}::jsonb`);
      params.push(JSON.stringify([{
        timestamp: new Date().toISOString(),
        note,
        by: req.user.email
      }]));
    }
    
    if (updates.length === 1) { // Only updated_at
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted', task: result.rows[0] });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
