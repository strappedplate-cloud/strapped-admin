import { NextRequest, NextResponse } from 'next/server';
import { getOngoingOrders, getPastOrders, getOrders, createOrder, deleteOrder } from '@/lib/data';
import { Order } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter');

  let orders: Order[];
  if (filter === 'ongoing') {
    orders = getOngoingOrders();
  } else if (filter === 'past') {
    orders = getPastOrders();
  } else {
    orders = getOrders();
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
      const allOrders = getOrders();
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
      no_hp: body.no_hp || '',
      alamat_pengiriman: body.alamat_pengiriman || '',
      jenis_bundling: body.jenis_bundling || '',
      ukuran_plat: body.ukuran_plat || '',
      qty: body.qty || 1,
      urutan_order: urutan_order,
      status: body.status || 'not_started',
      notes: body.notes || '',
      shipped_at: null,
      created_at: now,
      updated_at: now,
    };

    const created = createOrder(order);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const success = deleteOrder(id);
  if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
