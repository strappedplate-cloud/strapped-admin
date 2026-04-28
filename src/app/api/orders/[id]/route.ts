import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrder, deleteOrder, getOrders } from '@/lib/data';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.tanggal_pembelian && body.tanggal_pembelian.split('T')[0] !== order.tanggal_pembelian.split('T')[0]) {
      const allOrders = await getOrders();
      const newDate = body.tanggal_pembelian.split('T')[0];
      const ordersOnSameDate = allOrders.filter(o => o.id !== id && o.tanggal_pembelian.split('T')[0] === newDate);
      const maxUrutan = ordersOnSameDate.reduce((max, o) => Math.max(max, o.urutan_order || 0), 0);
      body.urutan_order = maxUrutan + 1;
    }

    const updated = await updateOrder(id, body);
    return NextResponse.json(updated);

  } catch {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const success = await deleteOrder(id);
  if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
