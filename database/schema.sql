-- ===========================================================================
-- Engineering Task Board — schema (Module 01)
--
-- This file is the SINGLE SOURCE OF TRUTH for the database schema. Both
-- backends map their models onto these tables; neither backend creates or
-- migrates schema at runtime.
--
-- Apply with:  psql -U postgres -d taskboard -f database/schema.sql
-- ===========================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50) NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in-progress', 'done')),
    assignee    VARCHAR(100),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

-- Keep updated_at honest without either ORM having to remember to set it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
