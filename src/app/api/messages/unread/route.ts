import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnreadCount } from '@/lib/data';

// GET /api/messages/unread  - returns { [fromUserId]: count }
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = (session.user as any).id as string;
  const counts = getUnreadCount(me);
  return NextResponse.json(counts);
}
