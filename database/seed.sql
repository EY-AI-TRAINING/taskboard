-- ===========================================================================
-- Engineering Task Board — seed data (Module 01)
--
-- Safe to re-run: it clears the table and resets the identity sequence first.
-- Apply with:  psql -U postgres -d taskboard -f database/seed.sql
-- ===========================================================================

TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;

INSERT INTO tasks (title, description, status, assignee) VALUES
    ('Set up the local PostgreSQL database',
     'Install Postgres (or run it in Docker) and apply schema.sql.',
     'done', 'Priya'),

    ('Scaffold the FastAPI backend',
     'Router -> Service -> Repository layout, mapped to the existing tasks table.',
     'done', 'Marco'),

    ('Implement GET /api/tasks with status filtering',
     'Return all tasks, or only those matching a ?status= query parameter.',
     'in-progress', 'Marco'),

    ('Build the React board UI',
     'Three columns (To Do / In Progress / Done) reading from /api/tasks.',
     'in-progress', 'Ana'),

    ('Add xUnit tests for the task service',
     'Cover create, list-with-filter, update and delete on the service layer.',
     'todo', 'Priya'),

    ('Write the Module 01 retro notes',
     'Capture where AI assistance helped and where it needed correction.',
     'todo', NULL);
