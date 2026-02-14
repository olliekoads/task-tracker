import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'blocked')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        category TEXT,
        tags TEXT[] DEFAULT '{}',
        notes JSONB DEFAULT '[]',
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
    `);
    
    // Add archived columns if they don't exist
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'archived'
        ) THEN
          ALTER TABLE tasks ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
          ALTER TABLE tasks ADD COLUMN archived_at TIMESTAMPTZ;
          CREATE INDEX idx_tasks_archived ON tasks(archived);
        END IF;
      END $$;
    `);
    
    // Add agent column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'agent'
        ) THEN
          ALTER TABLE tasks ADD COLUMN agent TEXT NOT NULL DEFAULT 'main';
          CREATE INDEX idx_tasks_agent ON tasks(agent);
        END IF;
      END $$;
    `);
    
    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
}

export default pool;
