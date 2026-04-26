import { NextRequest, NextResponse } from 'next/server';
import { getResellers, createReseller, deleteReseller, updateReseller } from '@/lib/data';
import { Reseller } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  return NextResponse.json(getResellers());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const reseller: Reseller = {
      id: uuidv4(),
      nama: body.nama || '',
      no_hp: body.no_hp || '',
      alamat: body.alamat || '',
      channel: body.channel || '',
      notes: body.notes || '',
      created_at: now,
      updated_at: now,
    };
    return NextResponse.json(createReseller(reseller), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const updated = updateReseller(id, updates);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const success = deleteReseller(id);
  if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
