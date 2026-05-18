'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '@/lib/types';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';

export default function ProductionListPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  if (
    session?.user &&
    (session.user as any).role !== 'admin' &&
    !(session.user as any).permissions?.includes('/production-list')
  ) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders?filter=ongoing');
      if (res.ok) {
        const all: Order[] = await res.json();
        setOrders(all.filter(o => o.status === 'production'));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Group by production_number
  const grouped: Record<string, Order[]> = {};
  orders.forEach(o => {
    const key = o.production_number || '(Tanpa Kode Produksi)';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  });

  const handleProductionDone = async (prodCode: string) => {
    setSaving(prodCode);
    const group = grouped[prodCode];
    
    try {
      await fetch('/api/orders/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: group.map(o => o.id), 
          updates: { status: 'production_done' } 
        }),
      });
    } catch (err) {
      console.error(err);
    }
    
    setSaving(null);
    fetchData();
  };

  const keys = Object.keys(grouped).sort();

  return (
    <main className="main-content">
      <div className="page-header">
        <h1 className="page-title">Production List</h1>
        <p className="page-subtitle">
          Daftar produksi yang sedang berjalan • {orders.length} order aktif
        </p>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-title">Loading...</div>
        </div>
      ) : keys.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏭</div>
          <div className="empty-state-title">Tidak ada produksi yang sedang berjalan</div>
          <div className="empty-state-desc">Order akan muncul di sini setelah dipindahkan ke tahap Production</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {keys.map(prodCode => {
            const group = grouped[prodCode];
            const isSaving = saving === prodCode;
            return (
              <div
                key={prodCode}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🏭</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
                        {prodCode}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {group.length} order dalam produksi ini
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleProductionDone(prodCode)}
                    disabled={isSaving}
                    style={{
                      background: isSaving ? 'var(--text-tertiary)' : '#22c55e',
                      borderColor: isSaving ? 'transparent' : '#22c55e',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                    }}
                  >
                    {isSaving ? '⏳ Menyimpan...' : '✅ Production Done'}
                  </button>
                </div>

                {/* Orders Table */}
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Nama Customer</th>
                      <th>Nomor Plat</th>
                      <th>Ukuran</th>
                      <th>Bundling</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.nama}</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{o.nomor_plat || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{o.ukuran_plat}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{o.jenis_bundling || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {o.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
