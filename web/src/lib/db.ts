import { Pool, QueryResultRow } from 'pg';

/**
 * Database connection pool for Scavengers
 * Uses standard pg library for compatibility with Supabase
 *
 * SSL Fix: Supabase's Supavisor pooler requires special SSL handling.
 * We modify the connection string to use sslmode=no-verify which bypasses
 * certificate chain validation while still using SSL encryption.
 */

// Create a connection pool (lazy initialization)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    // Get connection string - try multiple sources
    let connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || '';

    // If no connection string, try building from individual env vars
    if (!connectionString && process.env.POSTGRES_HOST && process.env.POSTGRES_PASSWORD) {
      const host = process.env.POSTGRES_HOST;
      const user = process.env.POSTGRES_USER || 'postgres';
      const password = process.env.POSTGRES_PASSWORD;
      const database = process.env.POSTGRES_DATABASE || 'postgres';
      connectionString = `postgresql://${user}:${password}@${host}:5432/${database}`;
      console.log('Built connection string from individual env vars');
    }

    // Remove Vercel-specific parameters that pg doesn't understand
    connectionString = connectionString.replace(/[&?]supa=base-pooler\.x/g, '');

    // Replace sslmode=require with sslmode=no-verify to bypass cert chain issues
    // This still uses SSL encryption but doesn't verify the certificate chain
    connectionString = connectionString.replace('sslmode=require', 'sslmode=no-verify');

    // If no sslmode specified, add no-verify
    if (!connectionString.includes('sslmode=')) {
      connectionString += connectionString.includes('?') ? '&sslmode=no-verify' : '?sslmode=no-verify';
    }

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Log connection info (without password) for debugging
    const sanitizedUrl = connectionString.replace(/:[^:@]+@/, ':***@');
    console.log('Database pool created with URL:', sanitizedUrl);
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
