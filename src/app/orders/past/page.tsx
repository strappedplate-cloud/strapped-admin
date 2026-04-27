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
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [exportSettings, setExportSettings] = React.useState({ type: 'month' as 'month' | 'year', month: new Date().getMonth() + 1, year: new Date().getFullYear() });


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
      String(o.production_number || '').toLowerCase().includes(search.toLowerCase()) ||
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

  const exportToCSV = () => {
    const dataToExport = orders.filter(o => {
      const d = new Date(o.tanggal_pembelian);
      if (exportSettings.type === 'month') {
        return (d.getMonth() + 1) === exportSettings.month && d.getFullYear() === exportSettings.year;
      } else {
        return d.getFullYear() === exportSettings.year;
      }
    });

    if (dataToExport.length === 0) {
      alert('Tidak ada data untuk periode ini.');
      return;
    }

    const headers = [
      'Order Number', 'Tanggal', 'Nama', 'Channel', 'Payment', 
      'Status', 'No Plat', 'Form Detail', 'Ukuran', 'Bundling', 
      'Editor', 'Prod #', 'Penerima', 'No HP', 'Alamat'
    ];

    const rows = dataToExport.map(o => [
      formatOrderNumber(o),
      o.tanggal_pembelian,
      o.nama,
      o.channel_pembelian,
      o.payment_status,
      ORDER_STATUS_LABELS[o.status],
      o.nomor_plat,
      o.form_detail,
      o.ukuran_plat,
      o.jenis_bundling,
      o.editor_name,
      o.production_number,
      o.nama_penerima || o.nama,
      o.no_hp,
      (o.alamat_pengiriman || '').replace(/\n/g, ' ')
    ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const filename = exportSettings.type === 'month' 
      ? `strapped past order- ${exportSettings.year}-${String(exportSettings.month).padStart(2, '0')}.csv`
      : `strapped past order- ${exportSettings.year}.csv`;
      
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    setShowExportModal(false);
  };

  return (
    <main className="main-content">
      <div className="page-header">
        <h1 className="page-title">Past Orders</h1>
        <p className="page-subtitle">Order yang sudah shipped lebih dari 7 hari • {filtered.length} orders</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '200px', marginBottom: 0, position: 'relative' }}>
          <span className="search-bar-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
          <input placeholder="Cari nama, plat, prod #..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
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
          <button 
            className="btn btn-primary btn-sm" 
            style={{ height: '38px', gap: '6px', display: 'flex', alignItems: 'center' }}
            onClick={() => setShowExportModal(true)}
          >
            <span>📥</span> Export
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

      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Export Orders</div>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Tipe Export</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" checked={exportSettings.type === 'month'} onChange={() => setExportSettings({ ...exportSettings, type: 'month' })} />
                    Bulanan
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" checked={exportSettings.type === 'year'} onChange={() => setExportSettings({ ...exportSettings, type: 'year' })} />
                    Tahunan
                  </label>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                {exportSettings.type === 'month' && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Bulan</label>
                    <select value={exportSettings.month} onChange={e => setExportSettings({ ...exportSettings, month: parseInt(e.target.value) })}>
                      {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Tahun</label>
                  <input type="number" value={exportSettings.year} onChange={e => setExportSettings({ ...exportSettings, year: parseInt(e.target.value) })} />
                </div>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
                * Mengambil data dari kategori Past Orders saja.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={exportToCSV}>Download CSV</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
