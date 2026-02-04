# Task Tracker - Ollie's Persistent Memory

A web app for tracking Ollie's tasks and work-in-progress across conversation resets.

## Purpose
- Track what Ollie is working on
- Remember pending tasks across session resets
- Visualize progress for Edwin and Michelle

## Stack
- Backend: Node.js + Express + PostgreSQL
- Frontend: React
- Auth: Google OAuth (whitelist: edwinlin1987@gmail.com, mmyung806@gmail.com)
- Deploy: Railway (backend) + Vercel (frontend)
- Domain: tasks.famylin.com

## Development Status
Started: 2026-02-04 15:54 PST

## API Endpoints
- POST /api/tasks - Create task
- GET /api/tasks - List tasks (with filters)
- PATCH /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task
- GET /api/tasks/:id - Get task details

## Task Schema
- id (uuid)
- title (string)
- description (text)
- status (todo|in-progress|done|blocked)
- priority (low|medium|high|urgent)
- category (string)
- tags (array)
- created_at (timestamp)
- updated_at (timestamp)
- created_by (email)
- notes (text array - activity log)
