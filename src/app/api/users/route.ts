import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/data';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User } from '@/lib/types';

export async function GET() {
  const users = getUsers().map(u => {
    const { password, ...rest } = u;
    return rest;
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.username || !body.password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const existing = getUsers().find(u => u.username === body.username);
    if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const newUser: User = {
      id: uuidv4(),
      username: body.username,
      password: hashedPassword,
      name: body.name || '',
      email: body.email || '',
      no_hp: body.no_hp || '',
      role: body.role || 'member',
      permissions: body.permissions || [],
      created_at: new Date().toISOString()
    };
    
    createUser(newUser);
    
    const { password, ...rest } = newUser;
    return NextResponse.json(rest);
  } catch (err: any) {
    console.error('User creation error:', err);
    return NextResponse.json({ error: `Failed to create user: ${err.message || 'Unknown error'}` }, { status: 500 });
  }
}

