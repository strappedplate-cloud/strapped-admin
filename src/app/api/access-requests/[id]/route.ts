import { NextRequest, NextResponse } from 'next/server';
import { updateAccessRequest, getUsers, writeJsonFile } from '@/lib/data';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const request = updateAccessRequest(id, status);
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    if (status === 'approved') {
      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === request.user_id);
      if (userIndex !== -1) {
        if (!users[userIndex].permissions) users[userIndex].permissions = [];
        if (!users[userIndex].permissions.includes(request.path)) {
          users[userIndex].permissions.push(request.path);
          writeJsonFile('users.json', users);
        }
      }
    }

    return NextResponse.json(request);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
