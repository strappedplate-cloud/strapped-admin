import { NextRequest, NextResponse } from 'next/server';
import { getMarketingContents, createMarketingContent } from '@/lib/marketing-data';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const items = await getMarketingContents();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = {
      id: `mkt-${uuidv4().slice(0, 8)}`,
      nama_konten: body.nama_konten || '',
      mobil: body.mobil || '',
      status: body.status || 'briefing',
      link_foto: body.link_foto || '',
      caption: body.caption || '',
      platform: body.platform || 'instagram',
      assigned_to: body.assigned_to || '',
      notes: body.notes || '',
      publish_date: body.publish_date || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const created = await createMarketingContent(item);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
