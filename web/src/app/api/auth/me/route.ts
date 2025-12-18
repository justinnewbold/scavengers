import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);

  if ('error' in auth) {
    return auth.error;
  }

  // Return user directly (not wrapped in { user: ... })
  return NextResponse.json(auth.user);
}
