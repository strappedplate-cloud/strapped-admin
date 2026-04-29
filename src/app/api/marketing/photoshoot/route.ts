import { NextRequest, NextResponse } from 'next/server';
import { getPhotoshootItems, createPhotoshootItem } from '@/lib/marketing-data';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const items = await getPhotoshootItems();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = {
      id: `ps-${uuidv4().slice(0, 8)}`,
      mobil: body.mobil || '',
      lokasi: body.lokasi || '',
      tanggal: body.tanggal || '',
      contact_name: body.contact_name || '',
      contact_phone: body.contact_phone || '',
      status: body.status || 'planned',
      notes: body.notes || '',
      foto_count: body.foto_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const created = await createPhotoshootItem(item);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
