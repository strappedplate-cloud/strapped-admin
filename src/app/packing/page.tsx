'use client';

import React from 'react';
import { PackingItem, Order } from '@/lib/types';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';

/** Group production orders by same customer (nama + no_hp + alamat_pengiriman) */
function groupOrders(orders: Order[]): Order[][] {
  const map = new Map<string, Order[]>();
  for (const o of orders) {
    const key = `${(o.nama || '').trim()}__${(o.no_hp || '').trim()}__${(o.alamat_pengiriman || '').trim()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return Array.from(map.values());
}

export default function PackingPage() {
  const { data: session } = useSession();

  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/packing')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [items, setItems] = React.useState<PackingItem[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ order_id: '', shipping_notes: '', packing_needs: '' });
  const [loading, setLoading] = React.useState(true);

  const fetchData = async () => {
    try {
      const [itemsRes, ordersRes] = await Promise.all([
        fetch('/api/packing'),
        fetch('/api/orders?filter=ongoing'),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ order_id: '', shipping_notes: '', packing_needs: '' });
    fetchData();
  };

  const togglePacked = async (item: PackingItem) => {
    await fetch('/api/packing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, is_packed: !item.is_packed }),
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/packing?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleShipped = async (group: Order[]) => {
    await Promise.all(
      group.map(o =>
        fetch(`/api/orders/${o.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'shipped' }),
        })
      )
    );
    fetchData();
  };

  const getOrderName = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    return order ? `${order.nama} — ${order.form_detail}` : orderId || 'General';
  };

  const packedOrders = orders.filter(o => o.status === 'production_done');
  const orderGroups = groupOrders(packedOrders);

  let packIndo = 0, packJapan = 0, packKeychain = 0, packCustom = 0, velcroIndo = 0, velcroJapan = 0;
  packedOrders.forEach(o => {
    const size = o.ukuran_plat || '';
    const bundle = o.jenis_bundling || '';
    if (['Mobil - Indo', 'Mix Size', 'Mobil - Euro'].includes(size)) packIndo++;
    if (['Mobil - Japan', 'Mix Size', 'Motor - Indo'].includes(size)) packJapan++;
    if (size === 'Keychain') packKeychain++;
    if (['Keychain', 'Velcro+Keychain'].includes(bundle)) packKeychain++;
    if (size === 'Custom Size') packCustom++;
    if (['Mobil - Indo', 'Mobil - Euro'].includes(size) && ['Velcro', 'Velcro+Keychain'].includes(bundle)) velcroIndo++;
    if (size === 'Mobil - Japan' && ['Velcro', 'Velcro+Keychain'].includes(bundle)) velcroJapan++;
  });

  let stickerMobilIndo = 0, stickerMobilEuro = 0, stickerMobilJapan = 0, stickerMotorIndo = 0;
  packedOrders.forEach(o => {
    // Sticker putih hanya untuk produk selain Keychain dan Velcro Plate Holder
    if (o.ukuran_plat === 'Keychain') return;
    if (o.product_type === 'Velcro Plate Holder') return;
    const size = o.ukuran_plat || '';
    const qty = o.qty || 1;
    if (size === 'Mobil - Indo') stickerMobilIndo += qty;
    if (size === 'Mobil - Euro') stickerMobilEuro += qty;
    if (size === 'Mobil - Japan') stickerMobilJapan += qty;
    if (size === 'Motor - Indo') stickerMotorIndo += qty;
  });

  const totalCards = packIndo + packJapan + packKeychain + packCustom;
  const qrWarranty = (packIndo + packJapan + packCustom) * 2;

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Packing List</h1>
          <p className="page-subtitle">Shipping notes &amp; packing needs • {items.filter(i => !i.is_packed).length} pending</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.open('/api/orders/generate-pdf', '_blank')}>📄 Export PDF</button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading...</div></div>
      ) : (
        <>
          {/* Packing Needs */}
          {packedOrders.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>📋 Packing Needs</h3>
              <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                <table className="data-table" style={{ width: 'auto', minWidth: '140px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                  <thead><tr><th colSpan={2} style={{ textAlign: 'center', background: 'var(--bg-tertiary)', fontStyle: 'italic' }}>Packaging</th></tr></thead>
                  <tbody>
                    <tr><td>Indo</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{packIndo}</td></tr>
                    <tr><td>Japan</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{packJapan}</td></tr>
                    <tr><td>Keychain</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{packKeychain}</td></tr>
                  </tbody>
                </table>
                <table className="data-table" style={{ width: 'auto', minWidth: '110px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                  <thead><tr><th colSpan={2} style={{ textAlign: 'center', background: 'var(--bg-tertiary)', fontStyle: 'italic' }}>Velcro</th></tr></thead>
                  <tbody>
                    <tr><td>Indo</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{velcroIndo}</td></tr>
                    <tr><td>Japan</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{velcroJapan}</td></tr>
                  </tbody>
                </table>
                <table className="data-table" style={{ width: 'auto', minWidth: '180px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                  <thead><tr><th colSpan={2} style={{ textAlign: 'center', background: 'var(--bg-tertiary)', fontStyle: 'italic' }}>Cards &amp; Sticker</th></tr></thead>
                  <tbody>
                    <tr><td>Thank You</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{totalCards}</td></tr>
                    <tr><td>Sticker</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{totalCards}</td></tr>
                    <tr><td>QR Warranty</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{qrWarranty}</td></tr>
                  </tbody>
                </table>
                <table className="data-table" style={{ width: 'auto', minWidth: '180px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                  <thead><tr><th colSpan={2} style={{ textAlign: 'center', background: 'var(--bg-tertiary)', fontStyle: 'italic' }}>Sticker Putih</th></tr></thead>
                  <tbody>
                    <tr><td>Mobil - Indo</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{stickerMobilIndo}</td></tr>
                    <tr><td>Mobil - Euro</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{stickerMobilEuro}</td></tr>
                    <tr><td>Mobil - Japan</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{stickerMobilJapan}</td></tr>
                    <tr><td>Motor - Indo</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{stickerMotorIndo}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ready to Pack — auto-grouped */}
          {orderGroups.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                📦 Ready to Pack ({packedOrders.length} order · {orderGroups.length} kiriman)
              </h3>
              <div className="packing-grid">
                {orderGroups.map((group, idx) => {
                  const isMerged = group.length > 1;
                  const first = group[0];
                  const plates = group.map(o => o.nomor_plat || 'NO DESIGN').join(', ');

                  // Size counts
                  const sizeCounts: Record<string, number> = {};
                  group.forEach(o => {
                    const s = o.ukuran_plat || 'Unknown';
                    sizeCounts[s] = (sizeCounts[s] || 0) + 1;
                  });
                  const sizeStr = Object.entries(sizeCounts).map(([s, c]) => `${c}× ${s}`).join(', ');

                  return (
                    <div
                      className="packing-card"
                      key={idx}
                      style={{
                        position: 'relative',
                        ...(isMerged ? { outline: '2px solid var(--accent)', background: 'rgba(99,102,241,0.07)' } : {}),
                      }}
                    >
                      {/* Merged badge */}
                      {isMerged && (
                        <span style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'var(--accent)', color: '#fff',
                          borderRadius: 6, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                        }}>
                          {group.length} orders
                        </span>
                      )}

                      {/* Header */}
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: 14 }}>
                          {first.nama_penerima || first.nama}
                        </span>
                        {first.no_hp && (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 6 }}>({first.no_hp})</span>
                        )}
                      </div>

                      {/* Plates */}
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                        {plates}
                      </div>

                      {/* Sizes */}
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{sizeStr}</div>

                      {/* Per-order bundles if merged */}
                      {isMerged ? (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                          {group.map((o, i) => (
                            <span key={i} style={{ marginRight: 6 }}>
                              {o.jenis_bundling || 'Non-Bundle'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          {first.jenis_bundling || 'Non-Bundle'}
                        </div>
                      )}

                      {/* Address */}
                      <div style={{
                        fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5,
                        marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8,
                      }}>
                        {first.alamat_pengiriman || '—'}
                      </div>

                      {/* Shipped Button */}
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleShipped(group)}
                          style={{
                            background: '#06b6d4',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          🚚 Shipped
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Packing Notes */}
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            📝 Packing Notes ({items.length})
          </h3>
          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">Belum ada packing notes</div>
            </div>
          ) : (
            <div className="packing-grid">
              {items.map(item => (
                <div className={`packing-card ${item.is_packed ? 'packed' : ''}`} key={item.id}>
                  <div className="packing-card-header">
                    <div className="packing-card-name">{getOrderName(item.order_id)}</div>
                    <button className={`packing-card-check ${item.is_packed ? 'checked' : ''}`} onClick={() => togglePacked(item)}>
                      {item.is_packed ? '✓' : ''}
                    </button>
                  </div>
                  {item.shipping_notes && (
                    <div className="packing-card-field">
                      <div className="packing-card-label">Shipping Notes</div>
                      <div className="packing-card-value">{item.shipping_notes}</div>
                    </div>
                  )}
                  {item.packing_needs && (
                    <div className="packing-card-field">
                      <div className="packing-card-label">Packing Needs</div>
                      <div className="packing-card-value">{item.packing_needs}</div>
                    </div>
                  )}
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">Tambah Packing Item</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Order (opsional)</label>
                  <select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}>
                    <option value="">General / tidak terkait order</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>{o.nama} — {o.form_detail}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Shipping Notes</label>
                  <textarea value={form.shipping_notes} onChange={e => setForm({ ...form, shipping_notes: e.target.value })} placeholder="Catatan pengiriman..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Packing Needs</label>
                  <textarea value={form.packing_needs} onChange={e => setForm({ ...form, packing_needs: e.target.value })} placeholder="Kebutuhan packing..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Tambah</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
