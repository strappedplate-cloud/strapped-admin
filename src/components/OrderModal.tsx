'use client';

import React from 'react';
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, OrderStatus, PaymentStatus } from '@/lib/types';
import { formatOrderNumber } from '@/lib/utils';



interface OrderModalProps {
  order: Order;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onSave: (orderId: string, updates: Partial<Order>) => void;
  onDelete: (orderId: string) => void;
}

export default function OrderModal({ order, onClose, onStatusChange, onSave, onDelete }: OrderModalProps) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<Partial<Order>>({ ...order });

  const handleSave = () => {
    onSave(order.id, form);
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Hapus order ini? Tindakan ini tidak bisa dibatalkan.')) {
      onDelete(order.id);
    }
  };

  const statusColor = ORDER_STATUS_COLORS[order.status];

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title">
            <span style={{ color: 'var(--accent)' }}>{formatOrderNumber(order)}</span> — {order.nama}
          </div>

          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Status selector */}
          <div style={{ marginBottom: 24 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Status</div>
            <select
              value={order.status}
              onChange={e => onStatusChange(order.id, e.target.value as OrderStatus)}
              style={{ borderLeft: `3px solid ${statusColor}` }}
            >
              {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {editing ? (
            <div className="form-grid">
              {/* Tanggal Order */}
              <div className="form-group full-width">
                <label className="form-label">Tanggal Order</label>
                <input type="date" value={form.tanggal_pembelian?.split('T')[0] || ''} onChange={e => setForm({ ...form, tanggal_pembelian: e.target.value })} />
              </div>

              {/* 1. Nama */}
              <div className="form-group">
                <label className="form-label">1. Nama</label>

                <input value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} />
              </div>

              {/* 2. Channel */}
              <div className="form-group">
                <label className="form-label">2. Channel</label>
                <select value={form.channel_pembelian || ''} onChange={e => setForm({ ...form, channel_pembelian: e.target.value })}>
                  <option value="">Pilih channel...</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Tokopedia / Tiktok Shop">Tokopedia / Tiktok Shop</option>
                  <option value="Shopee">Shopee</option>
                  <option value="Reseller">Reseller</option>
                  <option value="Offline">Offline</option>
                  <option value="Event">Event</option>

                </select>
              </div>

              {/* Conditional Reseller Name */}
              {form.channel_pembelian === 'Reseller' && (
                <div className="form-group">
                  <label className="form-label">Nama Reseller</label>
                  <input value={form.reseller_name || ''} onChange={e => setForm({ ...form, reseller_name: e.target.value })} placeholder="Masukkan nama reseller" />
                </div>
              )}



              {/* 3. Payment */}
              <div className="form-group">
                <label className="form-label">3. Payment</label>
                <select value={form.payment_status || 'Have Not Paid'} onChange={e => setForm({ ...form, payment_status: e.target.value as PaymentStatus })}>
                  <option value="Paid">Paid</option>
                  <option value="DP">DP</option>
                  <option value="Have Not Paid">Have Not Paid</option>
                </select>
              </div>

              <div className="form-group full-width" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 8 }}>
                <label className="form-label" style={{ fontSize: 16, fontWeight: 700 }}>4. Order Detail</label>
              </div>
              <div className="form-group">
                <label className="form-label">4A. Product</label>
                <select value={form.product_type || ''} onChange={e => setForm({ ...form, product_type: e.target.value })}>
                  <option value="">Pilih produk...</option>
                  <option value="Indonesia License Plate">Indonesia License Plate</option>
                  <option value="Indonesia EV License Plate">Indonesia EV License Plate</option>
                  <option value="Japanese Plate">Japanese Plate</option>
                  <option value="Dealer Plate">Dealer Plate</option>
                  <option value="Logo Plate">Logo Plate</option>
                  <option value="Text Plate">Text Plate</option>
                  <option value="Photo Plate">Photo Plate</option>
                  <option value="Custom Plate">Custom Plate</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">4B. Design</label>
                <input value={form.nomor_plat || ''} onChange={e => setForm({ ...form, nomor_plat: e.target.value })} />
              </div>

              <div className="form-group full-width">
                <label className="form-label">4C. Form Detail</label>
                <textarea value={form.form_detail || ''} onChange={e => setForm({ ...form, form_detail: e.target.value })} style={{ minHeight: '80px' }} />
              </div>

              <div className="form-group">
                <label className="form-label">4C. Size (Ukuran Plat)</label>
                <select value={form.ukuran_plat || ''} onChange={e => setForm({ ...form, ukuran_plat: e.target.value })}>
                  <option value="">Pilih ukuran...</option>
                  <option value="Mobil - Indo">Mobil - Indo</option>
                  <option value="Mobil - Japan">Mobil - Japan</option>
                  <option value="Mobil - Euro">Mobil - Euro</option>
                  <option value="Motor - Indo">Motor - Indo</option>
                  <option value="Keychain">Keychain</option>
                  <option value="Custom Size">Custom Size</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">4E. Bundling</label>
                <select value={form.jenis_bundling || ''} onChange={e => setForm({ ...form, jenis_bundling: e.target.value })}>
                  <option value="Non-Bundle">Non-Bundle</option>
                  <option value="Velcro">Velcro</option>
                  <option value="Keychain">Keychain</option>
                  <option value="Velcro+Keychain">Velcro+Keychain</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">4F. Qty</label>
                <input type="number" min={1} value={form.qty || 1} onChange={e => setForm({ ...form, qty: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="form-group">
                <label className="form-label">4G. Finishing</label>

                <input value={form.finishing || ''} onChange={e => setForm({ ...form, finishing: e.target.value })} />
              </div>


              {/* 5. Revision Note */}
              <div className="form-group full-width">
                <label className="form-label">5. Revision Note</label>
                <textarea value={form.revision_note || ''} onChange={e => setForm({ ...form, revision_note: e.target.value })} />
              </div>

              {/* 6. Progress (Managed by the status selector above, but adding label here for consistency) */}
              <div className="form-group">
                <label className="form-label">6. Progress</label>
                <div style={{ padding: '8px 0', fontSize: 14, color: 'var(--text-secondary)' }}>Dikelola di bagian atas modal</div>
              </div>

              {/* 7. Editor */}
              <div className="form-group">
                <label className="form-label">7. Editor</label>
                <input value={form.editor_name || ''} onChange={e => setForm({ ...form, editor_name: e.target.value })} />
              </div>

              {/* 8. Production Number */}
              <div className="form-group">
                <label className="form-label">8. Production Number</label>
                <input value={form.production_number || ''} onChange={e => setForm({ ...form, production_number: e.target.value })} />
              </div>

              {/* 9. Shipping Note */}
              <div className="form-group full-width" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 8, marginTop: 16 }}>
                <label className="form-label" style={{ fontSize: 16, fontWeight: 700 }}>9. Shipping Note</label>
              </div>
              <div className="form-group">
                <label className="form-label">9A. Nama Penerima</label>
                <input value={form.nama_penerima || ''} onChange={e => setForm({ ...form, nama_penerima: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">9B. No. HP</label>
                <input value={form.no_hp || ''} onChange={e => setForm({ ...form, no_hp: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label className="form-label">9C. Alamat</label>
                <textarea value={form.alamat_pengiriman || ''} onChange={e => setForm({ ...form, alamat_pengiriman: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="detail-grid">
              <div className="detail-field full-width">
                <div className="detail-label">Tanggal Order</div>
                <div className="detail-value">
                  {new Date(order.tanggal_pembelian).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">1. Nama</div>

                <div className="detail-value">{order.nama || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">2. Channel</div>
                <div className="detail-value">{order.channel_pembelian || '—'}</div>
              </div>
              {order.channel_pembelian === 'Reseller' && (
                <div className="detail-field">
                  <div className="detail-label">Nama Reseller</div>
                  <div className="detail-value">{order.reseller_name || '—'}</div>
                </div>
              )}
              <div className="detail-field">
                <div className="detail-label">3. Payment</div>
                <div className="detail-value">
                  <span className={`payment-badge ${order.payment_status?.toLowerCase().replace(/ /g, '-') || 'have-not-paid'}`}>
                    {order.payment_status || 'Have Not Paid'}
                  </span>
                </div>
              </div>

              <div className="detail-section-title full-width">4. Order Detail</div>
              {order.product_type && (
                <div className="detail-field">
                  <div className="detail-label">4A. Product</div>
                  <div className="detail-value">{order.product_type}</div>
                </div>
              )}
              <div className="detail-field">
                <div className="detail-label">4B. Design</div>
                <div className="detail-value" style={{ color: 'var(--accent)', fontWeight: 600 }}>{order.nomor_plat || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">4C. Form Detail</div>
                <div className="detail-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{order.form_detail || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">4D. Size</div>
                <div className="detail-value">{order.ukuran_plat || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">4E. Bundling</div>
                <div className="detail-value">{order.jenis_bundling || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">4F. Qty</div>
                <div className="detail-value">{order.qty}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">4G. Finishing</div>
                <div className="detail-value">{order.finishing || '—'}</div>
              </div>


              <div className="detail-field full-width">
                <div className="detail-label">5. Revision Note</div>
                <div className="detail-value">{order.revision_note || '—'}</div>
              </div>

              <div className="detail-field">
                <div className="detail-label">6. Progress</div>
                <div className="detail-value">
                  <span className="status-badge" style={{ background: `${statusColor}18`, color: statusColor }}>
                    <span className="status-dot" style={{ background: statusColor }} />
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>

              <div className="detail-field">
                <div className="detail-label">7. Editor</div>
                <div className="detail-value">{order.editor_name || '—'}</div>
              </div>

              <div className="detail-field">
                <div className="detail-label">8. Production Number</div>
                <div className="detail-value">{order.production_number || '—'}</div>
              </div>

              <div className="detail-section-title full-width">9. Shipping Note</div>
              <div className="detail-field">
                <div className="detail-label">9A. Nama Penerima</div>
                <div className="detail-value">{order.nama_penerima || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">9B. No. HP</div>
                <div className="detail-value">{order.no_hp || '—'}</div>
              </div>
              <div className="detail-field full-width">
                <div className="detail-label">9C. Alamat</div>
                <div className="detail-value">{order.alamat_pengiriman || '—'}</div>
              </div>

              <div className="detail-field" style={{ marginTop: 16 }}>
                <div className="detail-label">Created</div>
                <div className="detail-value" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {new Date(order.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑 Hapus</button>
          <div style={{ flex: 1 }} />
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={() => { setEditing(false); setForm({ ...order }); }}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave}>💾 Simpan</button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>✏️ Edit</button>
          )}
        </div>
      </div>
    </div>
  );
}
