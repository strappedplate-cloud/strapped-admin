import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessagesBetween, createMessage, markMessagesRead } from '@/lib/data';
import { ChatMessage } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/messages?with=USER_ID
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = (session.user as any).id as string;
  const withUser = req.nextUrl.searchParams.get('with');
  if (!withUser) return NextResponse.json({ error: 'Missing ?with=' }, { status: 400 });

  // Mark their messages to me as read
  markMessagesRead(withUser, me);

  const messages = getMessagesBetween(me, withUser);
  return NextResponse.json(messages);
}

// POST /api/messages
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = session.user as any;
  const body = await req.json();
  const { to_user_id, to_username, content } = body;

  if (!to_user_id || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const msg: ChatMessage = {
    id: uuidv4(),
    from_user_id: me.id,
    from_username: me.username || me.email || '',
    from_name: me.name || '',
    to_user_id,
    to_username: to_username || '',
    content: content.trim(),
    read: false,
    created_at: new Date().toISOString(),
  };

  createMessage(msg);
  return NextResponse.json(msg);
}
