import { NextRequest, NextResponse } from 'next/server';
import { updateUser, deleteUser, getUsers } from '@/lib/data';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Check if updating password
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    }
    
    // Check username uniqueness if changing
    if (body.username) {
      const existing = (await getUsers()).find(u => u.username === body.username && u.id !== id);
      if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const updated = await updateUser(id, body);
    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    
    const { password, ...rest } = updated;
    return NextResponse.json(rest);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = await deleteUser(id);
    if (!success) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
