'use client';

import React from 'react';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus } from '@/lib/types';
import OrderModal from '@/components/OrderModal';
import { formatOrderNumber } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';


export default function PastOrdersPage() {
  const { data: session } = useSession();
  
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/orders/past')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [search, setSearch] = React.useState('');
  const [filterDate, setFilterDate] = React.useState('');
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterYear, setFilterYear] = React.useState('');
  const [filterProdNum, setFilterProdNum] = React.useState('');
  const [filterChannel, setFilterChannel] = React.useState('');
  const [loading, setLoading] = React.useState(true);


  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?filter=past');
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o => {
    const matchesSearch = 
      String(o.nama || '').toLowerCase().includes(search.toLowerCase()) ||
      String(o.nomor_plat || '').toLowerCase().includes(search.toLowerCase()) ||
      String(o.form_detail || '').toLowerCase().includes(search.toLowerCase()) ||
      formatOrderNumber(o).toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;
    
    const d = new Date(o.tanggal_pembelian);
    if (filterDate && d.getDate() !== parseInt(filterDate)) return false;
    if (filterMonth && (d.getMonth() + 1) !== parseInt(filterMonth)) return false;
    if (filterYear && d.getFullYear() !== parseInt(filterYear)) return false;
    if (filterProdNum && !String(o.production_number || '').toLowerCase().includes(filterProdNum.toLowerCase())) return false;
    if (filterChannel && o.channel_pembelian !== filterChannel) return false;
    
    return true;
  });

  const uniqueChannels = Array.from(new Set(orders.map(o => o.channel_pembelian).filter(Boolean)));




  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
  };

  const handleSave = async (orderId: string, updates: Partial<Order>) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchOrders();
  };

  const handleDelete = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    setSelectedOrder(null);
    fetchOrders();
  };

  return (
    <main className="main-content">
      <div className="page-header">
        <h1 className="page-title">Past Orders</h1>
        <p className="page-subtitle">Order yang sudah shipped lebih dari 7 hari • {filtered.length} orders</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
          <span className="search-bar-icon">🔍</span>
          <input placeholder="Cari nama, plat..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input 
            type="number" 
            placeholder="Tgl" 
            style={{ width: '60px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 8px', color: 'var(--text-primary)' }} 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
          />
          <select 
            value={filterMonth} 
            onChange={e => setFilterMonth(e.target.value)} 
            style={{ width: '110px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
          >
             <option value="">Bulan</option>
             {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => (
               <option key={m} value={i + 1}>{m}</option>
             ))}
          </select>
          <input 
            type="number" 
            placeholder="Thn" 
            style={{ width: '75px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 8px', color: 'var(--text-primary)' }} 
            value={filterYear} 
            onChange={e => setFilterYear(e.target.value)} 
          />
          <input 
            placeholder="Prod #" 
            style={{ width: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 8px', color: 'var(--text-primary)' }} 
            value={filterProdNum} 
            onChange={e => setFilterProdNum(e.target.value)} 
          />
          <select 
            value={filterChannel} 
            onChange={e => setFilterChannel(e.target.value)} 
            style={{ width: '130px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
          >
             <option value="">Channel</option>
             {uniqueChannels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ height: '38px' }}
            onClick={() => { 
              setFilterDate(''); setFilterMonth(''); setFilterYear(''); setFilterProdNum(''); setFilterChannel(''); setSearch(''); 
            }}
          >
            Reset
          </button>
        </div>
      </div>


      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading...</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-title">Belum ada past orders</div>
          <div className="empty-state-text">Order yang sudah shipped selama 7 hari akan otomatis muncul di sini.</div>
        </div>
      ) : (
        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Number</th>

                <th>Nama</th>
                <th>Channel</th>

                <th>Payment</th>
                <th style={{ width: '85%' }}>Order Detail</th>
                <th>Progress</th>
                <th>Editor</th>
                <th>Prod #</th>
                <th style={{ width: '15%' }}></th>





              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const color = ORDER_STATUS_COLORS[order.status];
                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} style={{ cursor: 'pointer' }}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--accent)' }}>{formatOrderNumber(order)}</td>

                    <td className="text-truncate" style={{ fontWeight: 600, maxWidth: 120 }} title={order.nama}>{order.nama}</td>

                    <td>{order.channel_pembelian}</td>
                    <td>
                      <span className={`payment-badge ${order.payment_status?.toLowerCase().replace(/ /g, '-') || 'have-not-paid'}`}>
                        {order.payment_status || 'Have Not Paid'}
                      </span>
                    </td>
                    <td>
                      <div className="detail-stack">
                        <div className="detail-primary">{order.nomor_plat || '—'} <span className="detail-secondary">({order.form_detail})</span></div>
                        <div className="detail-secondary">{order.ukuran_plat} • {order.jenis_bundling}</div>
                      </div>
                    </td>


                    <td>
                      <span className="status-badge" style={{ background: `${color}18`, color }}>
                        <span className="status-dot" style={{ background: color }} />
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td>{order.editor_name || '—'}</td>
                    <td>{order.production_number || '—'}</td>
                    <td></td>






                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} onSave={handleSave} onDelete={handleDelete} />
      )}
    </main>
  );
}
