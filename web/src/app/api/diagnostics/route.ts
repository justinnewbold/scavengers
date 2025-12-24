import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {},
  };

  const checks: Record<string, { status: 'ok' | 'error' | 'warning'; message: string }> = {};

  // Check JWT_SECRET
  if (process.env.JWT_SECRET) {
    const length = process.env.JWT_SECRET.length;
    if (length >= 32) {
      checks.jwt_secret = { status: 'ok', message: `Configured (${length} chars)` };
    } else {
      checks.jwt_secret = { status: 'warning', message: `Configured but short (${length} chars, recommend 32+)` };
    }
  } else {
    checks.jwt_secret = { status: 'error', message: 'NOT CONFIGURED - auth will fail!' };
  }

  // Check POSTGRES_URL
  if (process.env.POSTGRES_URL) {
    checks.postgres_url = { status: 'ok', message: 'Configured' };
  } else {
    checks.postgres_url = { status: 'error', message: 'NOT CONFIGURED - database will fail!' };
  }

  // Check database connection
  try {
    const result = await sql`SELECT NOW() as time, current_database() as db`;
    if (result.rows.length > 0) {
      checks.database_connection = {
        status: 'ok',
        message: `Connected to ${result.rows[0].db} at ${result.rows[0].time}`,
      };
    } else {
      checks.database_connection = {
        status: 'warning',
        message: 'Connected but query returned no rows',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    checks.database_connection = {
      status: 'error',
      message: `Failed: ${errorMessage}`,
    };
  }

  // Check if tables exist
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'hunts', 'challenges', 'participants', 'submissions')
      ORDER BY table_name
    `;

    const existingTables = tables.rows.map((r) => r.table_name);
    const requiredTables = ['users', 'hunts', 'challenges', 'participants', 'submissions'];
    const missingTables = requiredTables.filter((t) => !existingTables.includes(t));

    if (missingTables.length === 0) {
      checks.database_schema = {
        status: 'ok',
        message: `All tables exist: ${existingTables.join(', ')}`,
      };
    } else {
      checks.database_schema = {
        status: 'error',
        message: `Missing tables: ${missingTables.join(', ')}. Run schema.sql in Supabase SQL Editor!`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    checks.database_schema = {
      status: 'error',
      message: `Could not check tables: ${errorMessage}`,
    };
  }

  // Check user count
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    const count = result.rows.length > 0 ? result.rows[0].count : 0;
    checks.users_table = {
      status: 'ok',
      message: `${count} users registered`,
    };
  } catch (error) {
    checks.users_table = {
      status: 'error',
      message: 'Could not query users table',
    };
  }

  // Check GEMINI_API_KEY (optional)
  if (process.env.GEMINI_API_KEY) {
    checks.gemini_api_key = { status: 'ok', message: 'Configured' };
  } else {
    checks.gemini_api_key = { status: 'warning', message: 'Not configured (AI features will use mock data)' };
  }

  diagnostics.checks = checks;

  // Overall status
  const hasErrors = Object.values(checks).some((c) => c.status === 'error');
  const hasWarnings = Object.values(checks).some((c) => c.status === 'warning');
  diagnostics.overall_status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

  // Summary message
  if (hasErrors) {
    diagnostics.summary = 'Configuration issues detected! Check the errors above.';
  } else if (hasWarnings) {
    diagnostics.summary = 'System is functional but has warnings.';
  } else {
    diagnostics.summary = 'All systems operational!';
  }

  return NextResponse.json(diagnostics, {
    status: hasErrors ? 500 : 200,
  });
}
