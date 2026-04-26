'use client';

import React from 'react';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import OrderModal from '@/components/OrderModal';
import OrderForm from '@/components/OrderForm';
import { OrderStatus } from '@/lib/types';
import { formatOrderNumber } from '@/lib/utils';


export default function OngoingOrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkEdit, setBulkEdit] = React.useState({
    payment_status: '',
    status: '',
    editor_name: '',
    production_number: ''
  });

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?filter=ongoing');
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(orders.filter(o => 
        String(o.nama || '').toLowerCase().includes(search.toLowerCase()) ||
        String(o.nomor_plat || '').toLowerCase().includes(search.toLowerCase()) ||
        String(o.form_detail || '').toLowerCase().includes(search.toLowerCase()) ||
        String(o.channel_pembelian || '').toLowerCase().includes(search.toLowerCase()) ||
        formatOrderNumber(o).toLowerCase().includes(search.toLowerCase())
      ).map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkUpdate = async () => {
    const updates: any = {};
    if (bulkEdit.payment_status) updates.payment_status = bulkEdit.payment_status;
    if (bulkEdit.status) updates.status = bulkEdit.status;
    if (bulkEdit.editor_name !== '') updates.editor_name = bulkEdit.editor_name;
    if (bulkEdit.production_number !== '') updates.production_number = bulkEdit.production_number;

    if (Object.keys(updates).length === 0) return;

    setLoading(true);
    await Promise.all(Array.from(selectedIds).map(id => 
      fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
    ));
    setSelectedIds(new Set());
    setBulkEdit({ payment_status: '', status: '', editor_name: '', production_number: '' });
    fetchOrders();
  };


  React.useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o =>
    String(o.nama || '').toLowerCase().includes(search.toLowerCase()) ||
    String(o.nomor_plat || '').toLowerCase().includes(search.toLowerCase()) ||
    String(o.form_detail || '').toLowerCase().includes(search.toLowerCase()) ||
    String(o.channel_pembelian || '').toLowerCase().includes(search.toLowerCase()) ||
    formatOrderNumber(o).toLowerCase().includes(search.toLowerCase())
  );



  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
    setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
  };

  const handleSave = async (orderId: string, updates: Partial<Order>) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedOrder(updated);
      fetchOrders();
    }
  };

  const handleDelete = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    setSelectedOrder(null);
    fetchOrders();
  };

  const handleNew = async (data: Partial<Order>) => {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setShowForm(false);
    fetchOrders();
  };

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Ongoing Orders</h1>
          <p className="page-subtitle">{filtered.length} active orders</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => window.open('/api/orders/generate-pdf', '_blank')}>🖨️ Print Shipping</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>✚ Order Baru</button>
        </div>

      </div>

      <div className="search-bar" style={{ marginBottom: 20 }}>
        <span className="search-bar-icon">🔍</span>
        <input placeholder="Cari nama, plat, channel..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {selectedIds.size > 0 && (
        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '20px',
          border: '1px solid var(--accent-soft)',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--accent)', marginRight: '8px' }}>
            {selectedIds.size} selected
          </div>
          <select 
            value={bulkEdit.payment_status} 
            onChange={e => setBulkEdit({...bulkEdit, payment_status: e.target.value})}
            style={{ width: '140px' }}
          >
            <option value="">-- Payment --</option>
            <option value="Paid">Paid</option>
            <option value="DP">DP</option>
            <option value="Have Not Paid">Have Not Paid</option>
          </select>
          <select 
            value={bulkEdit.status} 
            onChange={e => setBulkEdit({...bulkEdit, status: e.target.value})}
            style={{ width: '160px' }}
          >
            <option value="">-- Progress --</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input 
            placeholder="Editor Name" 
            value={bulkEdit.editor_name} 
            onChange={e => setBulkEdit({...bulkEdit, editor_name: e.target.value})}
            style={{ width: '140px' }}
          />
          <input 
            placeholder="Production #" 
            value={bulkEdit.production_number} 
            onChange={e => setBulkEdit({...bulkEdit, production_number: e.target.value})}
            style={{ width: '120px' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleBulkUpdate}>Apply Changes</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading...</div></div>
      ) : filtered.length === 0 ? (

        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Tidak ada order</div>
          <div className="empty-state-text">Belum ada order aktif. Klik &quot;Order Baru&quot; untuk menambahkan.</div>
        </div>
      ) : (
        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Order Number</th>


                <th>Nama</th>
                <th>Channel</th>

                <th>Payment</th>
                <th style={{ width: '85%' }}>Order Detail</th>
                <th>Revision</th>
                <th>Progress</th>
                <th>Editor</th>
                <th>Prod #</th>
                <th>Shipping Note</th>
                <th style={{ width: '15%' }}></th>




              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const color = ORDER_STATUS_COLORS[order.status];
                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} style={{ cursor: 'pointer', background: selectedIds.has(order.id) ? 'var(--bg-tertiary)' : undefined }}>
                    <td onClick={(e) => toggleSelect(order.id, e)} style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(order.id)} 
                        onChange={(e) => toggleSelect(order.id, e)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
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
                        <div className="detail-secondary">{order.qty} pcs • {order.finishing || '—'}</div>
                      </div>
                    </td>

                    <td className="text-truncate" style={{ maxWidth: 80 }} title={order.revision_note}>{order.revision_note || '—'}</td>

                    <td>
                      <span className="status-badge" style={{ background: `${color}18`, color }}>
                        <span className="status-dot" style={{ background: color }} />
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td>{order.editor_name || '—'}</td>
                    <td>{order.production_number || '—'}</td>
                    <td>
                      <div className="detail-stack">
                        <div className="detail-primary">{order.nama_penerima || '—'}</div>
                        <div className="detail-secondary">{order.no_hp}</div>
                        <div className="detail-secondary text-truncate" style={{ maxWidth: 120 }} title={order.alamat_pengiriman}>{order.alamat_pengiriman}</div>
                      </div>
                    </td>
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
      {showForm && <OrderForm onSubmit={handleNew} onCancel={() => setShowForm(false)} />}
    </main>
  );
}
