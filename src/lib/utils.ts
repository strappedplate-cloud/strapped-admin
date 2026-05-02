import { Order } from './types';

export function formatOrderNumber(order: Order): string {
  if (!order.tanggal_pembelian) return '—';
  
  // Parse YYYY-MM-DD directly to avoid UTC timezone shifting date by -1
  const raw = order.tanggal_pembelian.split('T')[0]; // handle both "2026-04-28" and ISO strings
  const parts = raw.split('-');
  if (parts.length < 3) return '—';

  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  
  return `${year}${month}${day}-${order.urutan_order || 1}`;
}
