import { sql } from '@vercel/postgres';

/**
 * Database utility functions for Scavengers
 *
 * This file provides helper functions for common database operations.
 * All API routes use @vercel/postgres which automatically connects
 * using the POSTGRES_URL environment variable.
 */

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
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
      sql`SELECT COUNT(*) as count FROM users`,
      sql`SELECT COUNT(*) as count FROM hunts`,
      sql`SELECT COUNT(*) as count FROM challenges`,
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
