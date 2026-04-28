import { NextRequest, NextResponse } from 'next/server';
import { getPackingItems, createPackingItem, updatePackingItem, deletePackingItem } from '@/lib/data';
import { PackingItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  return NextResponse.json(await getPackingItems());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const item: PackingItem = {
      id: uuidv4(),
      order_id: body.order_id || '',
      shipping_notes: body.shipping_notes || '',
      packing_needs: body.packing_needs || '',
      is_packed: false,
      created_at: now,
      updated_at: now,
    };
    return NextResponse.json(await createPackingItem(item), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const updated = await updatePackingItem(id, updates);
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
  const success = await deletePackingItem(id);
  if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
