import { Order } from './types';

export function formatOrderNumber(order: Order): string {
  if (!order.tanggal_pembelian) return '—';
  
  const date = new Date(order.tanggal_pembelian);
  if (isNaN(date.getTime())) return '—';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}-${order.urutan_order || 1}`;
}
