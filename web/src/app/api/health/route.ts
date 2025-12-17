import { NextResponse } from 'next/server';
import { testConnection, getDbStats } from '@/lib/db';

/**
 * Health check endpoint
 * GET /api/health
 *
 * Returns the status of the application and database connection.
 * Use this to verify your Vercel Postgres is connected correctly.
 */
export async function GET() {
  const dbConnection = await testConnection();
  const dbStats = dbConnection.connected ? await getDbStats() : null;

  const health = {
    status: dbConnection.connected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnection.connected,
      serverTime: dbConnection.connected ? dbConnection.time : null,
      error: dbConnection.connected ? null : dbConnection.error,
    },
    stats: dbStats,
    // Environment info removed for security - don't expose config details
  };

  return NextResponse.json(health, {
    status: dbConnection.connected ? 200 : 503,
  });
}
