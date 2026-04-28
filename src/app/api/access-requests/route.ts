import { NextRequest, NextResponse } from 'next/server';
import { getAccessRequests, createAccessRequest } from '@/lib/data';
import { v4 as uuidv4 } from 'uuid';
import { AccessRequest } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await getAccessRequests());
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { path } = body;

    const existing = (await getAccessRequests()).find(
      r => r.user_id === (session.user as any).id && r.path === path && r.status === 'pending'
    );
    if (existing) return NextResponse.json({ message: 'Request already pending' });

    const newRequest: AccessRequest = {
      id: uuidv4(),
      user_id: (session.user as any).id,
      username: (session.user as any).username,
      path,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await createAccessRequest(newRequest);
    return NextResponse.json(newRequest);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
