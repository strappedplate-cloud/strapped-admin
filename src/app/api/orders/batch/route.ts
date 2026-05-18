import { NextRequest, NextResponse } from 'next/server';
import { updateOrdersBatch } from '@/lib/data';

export async function PATCH(req: NextRequest) {
  try {
    const { ids, updates } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }
    
    // Some basic check for tanggal_pembelian is skipping here because batch 
    // is mostly used for status updates.
    
    const updated = await updateOrdersBatch(ids, updates);
    return NextResponse.json({ success: true, updated: updated.length });
  } catch (error) {
    console.error('Batch update error', error);
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
