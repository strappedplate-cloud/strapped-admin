import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updatePresence, getOnlineUsers } from '@/lib/data';

// POST /api/presence  - heartbeat, mark me as online
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = (session.user as any).id as string;
  updatePresence(me);
  return NextResponse.json({ ok: true });
}

// GET /api/presence  - returns array of online user IDs
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const onlineIds = getOnlineUsers(30); // 30 second threshold
  return NextResponse.json(onlineIds);
}
