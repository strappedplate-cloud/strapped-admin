'use client';

import React from 'react';
import { Order } from '@/lib/types';

// ─── Price Tables ─────────────────────────────────────────────
const PRICES: Record<'retail' | 'reseller', Record<string, number>> = {
  retail: {
    'Plate-Single-Mobil':                   250000,
    'Plate-Double-Mobil':                   350000,
    'Plate-Single-Mobil-Bundle Velcro':     315000,
    'Plate-Double-Mobil-Bundle Velcro':     450000,
    'Plate-Single-Mobil-Bundle Keychain':   300000,
    'Plate-Double-Mobil-Bundle Keychain':   400000,
    'Plate-Single-Mobil-Bundle Velcro+Keychain': 365000,
    'Plate-Double-Mobil-Bundle Velcro+Keychain': 500000,
    'Plate-Single-Motor':                   175000,
    'Plate-Double-Motor':                   250000,
    'Plate-Single-Motor-Bundle Keychain':   225000,
    'Plate-Double-Motor-Bundle Keychain':   300000,
    'Keychain':                              55000,
    'Velcro-Single':                         90000,
    'Velcro-Double':                        150000,
    'FRAMED-Chrome':                        550000,
    'FRAMED-Rose Gold':                    1000000,
    'FRAMED-Black Chrome':                 1100000,
  },
  reseller: {
    'Plate-Single-Mobil':                   210000,
    'Plate-Double-Mobil':                   300000,
    'Plate-Single-Mobil-Bundle Velcro':     285000,
    'Plate-Double-Mobil-Bundle Velcro':     400000,
    'Plate-Single-Mobil-Bundle Keychain':   250000,
    'Plate-Double-Mobil-Bundle Keychain':   340000,
    'Plate-Single-Mobil-Bundle Velcro+Keychain': 335000,
    'Plate-Double-Mobil-Bundle Velcro+Keychain': 440000,
    'Plate-Single-Motor':                   150000,
    'Plate-Double-Motor':                   210000,
    'Plate-Single-Motor-Bundle Keychain':   190000,
    'Plate-Double-Motor-Bundle Keychain':   250000,
    'Keychain':                              45000,
    'Velcro-Single':                         75000,
    'Velcro-Double':                        100000,
    'FRAMED-Chrome':                        500000,
    'FRAMED-Rose Gold':                     900000,
    'FRAMED-Black Chrome':                 1000000,
  },
};

function getBundleLabel(jenis_bundling: string): string {
  const b = (jenis_bundling || '').toLowerCase();
  if (b === 'velcro+keychain') return 'Bundle Velcro+Keychain';
  if (b === 'velcro') return 'Bundle Velcro';
  if (b === 'keychain') return 'Bundle Keychain';
  return '';
}

function lookupPrice(
  customerType: 'retail' | 'reseller',
  vehicleType: 'Mobil' | 'Motor',
  qtyLabel: 'Single' | 'Double',
  bundleLabel: string
): number {
  const table = PRICES[customerType];
  let key = `Plate-${qtyLabel}-${vehicleType}`;
  if (bundleLabel) key += `-${bundleLabel}`;
  return table[key] ?? 0;
}

function formatRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

// ─── Invoice number (localStorage counter) ────────────────────
function generateInvoiceNo(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const key = `strapped_invoice_${yy}${mm}`;
  const prev = parseInt(localStorage.getItem(key) || '0', 10);
  const next = prev + 1;
  localStorage.setItem(key, String(next));
  return `${yy}${mm}${String(next).padStart(3, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────
export interface ExtraProduct { product: string; price: string; qty: string; }
export interface OrderLineData {
  vehicleType: 'Mobil' | 'Motor';
  bundleOverride: string; // e.g. "Bundle Velcro" or ""
}
export interface InvoicePayload {
  orders: Order[];
  customerType: 'retail' | 'reseller';
  bengkelName: string;
  perOrder: Record<string, OrderLineData>;
  extras: ExtraProduct[];
  shippingService: string;
  shippingTotal: string;
  invoiceNo: string;
}

interface Props {
  orders: Order[];
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────
export default function InvoiceModal({ orders, onClose }: Props) {
  const firstOrder = orders[0];

  const [customerType, setCustomerType] = React.useState<'retail' | 'reseller'>('retail');
  const [bengkelName, setBengkelName] = React.useState('');

  // Detect vehicle type from ukuran_plat
  const detectVehicle = (order: Order): 'Mobil' | 'Motor' => {
    const u = (order.ukuran_plat || '').toLowerCase();
    if (u.includes('motor')) return 'Motor';
    return 'Mobil';
  };

  const [perOrder, setPerOrder] = React.useState<Record<string, OrderLineData>>(() => {
    const map: Record<string, OrderLineData> = {};
    orders.forEach(o => {
      map[o.id] = {
        vehicleType: detectVehicle(o),
        bundleOverride: getBundleLabel(o.jenis_bundling),
      };
    });
    return map;
  });

  const [extras, setExtras] = React.useState<ExtraProduct[]>([
    { product: '', price: '', qty: '' },
  ]);
  const [shippingService, setShippingService] = React.useState('');
  const [shippingTotal, setShippingTotal] = React.useState('');
  const [generating, setGenerating] = React.useState(false);

  // ─── Derived price per order line ──────────────────────────
  const orderLines = orders.map(o => {
    const line = perOrder[o.id] ?? { vehicleType: 'Mobil', bundleOverride: '' };
    const qtyLabel: 'Single' | 'Double' = (o.qty ?? 1) >= 2 ? 'Double' : 'Single';
    const price = lookupPrice(customerType, line.vehicleType, qtyLabel, line.bundleOverride);
    const subtotal = price; // invoice qty always 1 per row
    return { order: o, line, qtyLabel, price, subtotal };
  });

  const validExtras = extras.filter(e => e.product.trim() && parseFloat(e.price) > 0 && parseInt(e.qty) > 0);
  const extraSubtotals = validExtras.map(e => parseFloat(e.price) * parseInt(e.qty));
  const orderSubtotal = orderLines.reduce((s, l) => s + l.subtotal, 0);
  const extraSubtotal = extraSubtotals.reduce((s, v) => s + v, 0);
  const shipping = parseFloat(shippingTotal) || 0;
  const grandTotal = orderSubtotal + extraSubtotal + shipping;

  // ─── Generate invoice ──────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    const invoiceNo = generateInvoiceNo();

    const payload: InvoicePayload = {
      orders,
      customerType,
      bengkelName,
      perOrder,
      extras: validExtras,
      shippingService,
      shippingTotal,
      invoiceNo,
    };

    try {
      const res = await fetch('/api/orders/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert('Gagal generate invoice: ' + (err.error || res.statusText));
        // Rollback counter
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const key = `strapped_invoice_${yy}${mm}`;
        const prev = parseInt(localStorage.getItem(key) || '1', 10);
        localStorage.setItem(key, String(Math.max(0, prev - 1)));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err: any) {
      alert('Gagal generate invoice: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updatePerOrder = (id: string, patch: Partial<OrderLineData>) => {
    setPerOrder(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const updateExtra = (idx: number, patch: Partial<ExtraProduct>) => {
    setExtras(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const BUNDLE_OPTIONS = ['', 'Bundle Velcro', 'Bundle Keychain', 'Bundle Velcro+Keychain'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 700, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧾</span> Generate Invoice
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Customer info (read-only) */}
          <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {firstOrder?.nama_penerima || firstOrder?.nama}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {firstOrder?.no_hp} &nbsp;·&nbsp; {orders.length} order{orders.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Customer Type */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Tipe Customer
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['retail', 'reseller'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setCustomerType(t)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${customerType === t ? 'var(--accent)' : 'var(--border)'}`,
                    background: customerType === t ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: customerType === t ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontSize: 14,
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'retail' ? '🛒 Retail' : '🏪 Reseller'}
                </button>
              ))}
            </div>
            {customerType === 'reseller' && (
              <input
                placeholder="Nama Bengkel / Toko"
                value={bengkelName}
                onChange={e => setBengkelName(e.target.value)}
                style={{ marginTop: 10, width: '100%' }}
              />
            )}
          </div>

          {/* Per-Order Lines */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Detail Order
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orderLines.map(({ order, line, qtyLabel, price, subtotal }) => (
                <div key={order.id} style={{
                  padding: 14,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {order.nomor_plat || '—'} &nbsp;
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                          ({qtyLabel} · {order.ukuran_plat})
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                        {order.jenis_bundling || 'Non-Bundle'}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14, whiteSpace: 'nowrap' }}>
                      {formatRp(subtotal)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {/* Mobil / Motor */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Kendaraan</label>
                      <select
                        value={line.vehicleType}
                        onChange={e => updatePerOrder(order.id, { vehicleType: e.target.value as 'Mobil' | 'Motor' })}
                        style={{ width: '100%', fontSize: 13 }}
                      >
                        <option value="Mobil">🚗 Mobil</option>
                        <option value="Motor">🏍️ Motor</option>
                      </select>
                    </div>
                    {/* Bundle override */}
                    <div style={{ flex: 2, minWidth: 160 }}>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Bundle</label>
                      <select
                        value={line.bundleOverride}
                        onChange={e => updatePerOrder(order.id, { bundleOverride: e.target.value })}
                        style={{ width: '100%', fontSize: 13 }}
                      >
                        {BUNDLE_OPTIONS.map(b => (
                          <option key={b} value={b}>{b || 'Tidak ada bundle'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                    Harga: {formatRp(price)} × 1 = {formatRp(subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra Products */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Produk Tambahan (opsional)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {extras.map((ex, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    placeholder="Produk"
                    value={ex.product}
                    onChange={e => updateExtra(idx, { product: e.target.value })}
                    style={{ flex: 3, minWidth: 100, fontSize: 13 }}
                  />
                  <input
                    placeholder="Harga"
                    type="number"
                    value={ex.price}
                    onChange={e => updateExtra(idx, { price: e.target.value })}
                    style={{ flex: 2, minWidth: 80, fontSize: 13 }}
                  />
                  <input
                    placeholder="Qty"
                    type="number"
                    min="1"
                    value={ex.qty}
                    onChange={e => updateExtra(idx, { qty: e.target.value })}
                    style={{ flex: 1, minWidth: 50, fontSize: 13 }}
                  />
                  {extras.length > 1 && (
                    <button
                      onClick={() => setExtras(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setExtras(prev => [...prev, { product: '', price: '', qty: '' }])}
                style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginTop: 4 }}
              >
                + Tambah Produk
              </button>
            </div>
          </div>

          {/* Shipping */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Pengiriman
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                placeholder="Jasa Pengiriman (e.g. JNE REG)"
                value={shippingService}
                onChange={e => setShippingService(e.target.value)}
                style={{ flex: 2, minWidth: 150, fontSize: 13 }}
              />
              <input
                placeholder="Ongkir (Rp)"
                type="number"
                value={shippingTotal}
                onChange={e => setShippingTotal(e.target.value)}
                style={{ flex: 1, minWidth: 100, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Grand Total Preview */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent-soft)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>Subtotal Order</span><span>{formatRp(orderSubtotal)}</span>
            </div>
            {extraSubtotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Subtotal Tambahan</span><span>{formatRp(extraSubtotal)}</span>
              </div>
            )}
            {shipping > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Ongkir ({shippingService || '—'})</span><span>{formatRp(shipping)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
              <span>Grand Total</span><span>{formatRp(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={generating}>Batal</button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating} style={{ minWidth: 160 }}>
            {generating ? '⏳ Generating...' : '📄 Terbitkan Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
