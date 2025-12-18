import { Pool, QueryResultRow } from 'pg';

/**
 * Database connection pool for Scavengers
 * Uses standard pg library for compatibility with Supabase
 */

// Create a connection pool (lazy initialization)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    // Get connection string and remove Vercel-specific parameters
    let connectionString = process.env.POSTGRES_URL || '';

    // Remove supa=base-pooler.x parameter (Vercel-specific, not needed for pg)
    connectionString = connectionString.replace(/[&?]supa=base-pooler\.x/g, '');

    pool = new Pool({
      connectionString,
      // SSL configuration for Supabase
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * Tagged template literal for SQL queries (compatible with @vercel/postgres syntax)
 */
export async function sql<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  // Build parameterized query
  let text = '';
  const params: unknown[] = [];

  strings.forEach((string, i) => {
    text += string;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });

  const result = await getPool().query<T>(text, params);
  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const result = await sql<{ current_time: Date }>`SELECT NOW() as current_time`;
    return { connected: true, time: result.rows[0].current_time };
  } catch (error) {
    console.error('Database connection error:', error);
    return { connected: false, error: String(error) };
  }
}

/**
 * Get database statistics
 */
export async function getDbStats() {
  try {
    const [users, hunts, challenges] = await Promise.all([
      sql<{ count: string }>`SELECT COUNT(*) as count FROM users`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM hunts`,
      sql<{ count: string }>`SELECT COUNT(*) as count FROM challenges`,
    ]);

    return {
      users: Number(users.rows[0].count),
      hunts: Number(hunts.rows[0].count),
      challenges: Number(challenges.rows[0].count),
    };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return null;
  }
}
