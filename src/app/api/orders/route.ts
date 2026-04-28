import { NextRequest, NextResponse } from 'next/server';
import { getOngoingOrders, getPastOrders, getOrders, createOrder, deleteOrder } from '@/lib/data';
import { Order } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter');

  let orders: Order[];
  if (filter === 'ongoing') {
    orders = await getOngoingOrders();
  } else if (filter === 'past') {
    orders = await getPastOrders();
  } else {
    orders = await getOrders();
  }

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date().toISOString();
    const tanggal = body.tanggal_pembelian || now.split('T')[0];

    
    // Calculate urutan_order if not provided
    let urutan_order = body.urutan_order;
    if (!urutan_order) {
      const allOrders = await getOrders();
      const ordersOnSameDate = allOrders.filter(o => o.tanggal_pembelian.split('T')[0] === tanggal.split('T')[0]);
      const maxUrutan = ordersOnSameDate.reduce((max, o) => Math.max(max, o.urutan_order || 0), 0);
      urutan_order = maxUrutan + 1;
    }

    const order: Order = {
      id: uuidv4(),
      form_detail: body.form_detail || '',
      nama: body.nama || '',
      tanggal_pembelian: tanggal,
      channel_pembelian: body.channel_pembelian || '',
      jenis_bundling: body.jenis_bundling || '',
      ukuran_plat: body.ukuran_plat || '',
      qty: body.qty || 1,
      urutan_order: urutan_order,
      status: body.status || 'not_started',
      payment_status: body.payment_status || 'Have Not Paid',
      nomor_plat: body.nomor_plat || '',
      finishing: body.finishing || '',
      revision_note: body.revision_note || '',
      editor_name: body.editor_name || '',
      production_number: body.production_number || '',
      reseller_name: body.reseller_name || '',
      event_name: body.event_name || '',
      nama_penerima: body.nama_penerima || body.nama || '',
      no_hp: body.no_hp || '',
      alamat_pengiriman: body.alamat_pengiriman || '',
      notes: body.notes || '',
      shipped_at: null,
      created_at: now,
      updated_at: now,
    };

    const created = await createOrder(order);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const success = await deleteOrder(id);
  if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
