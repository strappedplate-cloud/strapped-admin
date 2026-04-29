'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';
import { PhotoshootItem, PHOTOSHOOT_STATUS_LABELS, PHOTOSHOOT_STATUS_COLORS } from '@/lib/marketing-types';

export default function PhotoshootPage() {
  const { data: session } = useSession();
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/marketing/photoshoot')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [items, setItems] = React.useState<PhotoshootItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editItem, setEditItem] = React.useState<PhotoshootItem | null>(null);
  const [form, setForm] = React.useState({ mobil: '', lokasi: '', tanggal: '', contact_name: '', contact_phone: '', status: 'planned' as any, notes: '', foto_count: 0 });

  const fetchItems = async () => {
    try { const res = await fetch('/api/marketing/photoshoot'); if (res.ok) setItems(await res.json()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  React.useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(i => i.mobil.toLowerCase().includes(search.toLowerCase()) || i.contact_name.toLowerCase().includes(search.toLowerCase()) || i.lokasi.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => { setForm({ mobil: '', lokasi: '', tanggal: '', contact_name: '', contact_phone: '', status: 'planned', notes: '', foto_count: 0 }); setEditItem(null); setShowForm(false); };

  const handleSubmit = async () => {
    if (!form.mobil) return;
    if (editItem) { await fetch(`/api/marketing/photoshoot/${editItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); }
    else { await fetch('/api/marketing/photoshoot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); }
    resetForm(); fetchItems();
  };

  const handleEdit = (item: PhotoshootItem) => {
    setForm({ mobil: item.mobil, lokasi: item.lokasi, tanggal: item.tanggal, contact_name: item.contact_name, contact_phone: item.contact_phone, status: item.status, notes: item.notes, foto_count: item.foto_count });
    setEditItem(item); setShowForm(true);
  };

  const handleDelete = async (id: string) => { if (!confirm('Hapus photoshoot ini?')) return; await fetch(`/api/marketing/photoshoot/${id}`, { method: 'DELETE' }); fetchItems(); };

  const handleWhatsApp = (phone: string, mobil: string) => {
    const msg = encodeURIComponent(`Halo, ini dari Strapped Indonesia. Mau konfirmasi jadwal photoshoot untuk ${mobil}. Apakah masih sesuai jadwal?`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">📷 Photoshoot</h1>
          <p className="page-subtitle">{items.filter(i => i.status !== 'done' && i.status !== 'cancelled').length} upcoming • {items.filter(i => i.status === 'done').length} selesai</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>✚ Jadwal Baru</button>
      </div>

      <div className="mkt-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {Object.entries(PHOTOSHOOT_STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="mkt-stat-card" style={{ '--stat-color': PHOTOSHOOT_STATUS_COLORS[key], cursor: 'default' } as React.CSSProperties}>
            <div className="mkt-stat-count">{items.filter(i => i.status === key).length}</div>
            <div className="mkt-stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
        <input placeholder="Cari mobil, lokasi, contact..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%', height: 40, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'white' }} />
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading...</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📷</div><div className="empty-state-title">Belum ada jadwal</div><div className="empty-state-text">Klik &quot;Jadwal Baru&quot; untuk menambahkan.</div></div>
      ) : (
        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Mobil</th><th>Lokasi</th><th>Tanggal</th><th>Contact</th><th>Status</th><th>Foto</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {filtered.map(item => {
                const color = PHOTOSHOOT_STATUS_COLORS[item.status] || '#6b7280';
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}><span className="mkt-car-badge">{item.mobil}</span></td>
                    <td>{item.lokasi || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td><div className="detail-stack"><div className="detail-primary">{item.contact_name || '—'}</div><div className="detail-secondary">{item.contact_phone}</div></div></td>
                    <td><span className="status-badge" style={{ background: `${color}18`, color }}><span className="status-dot" style={{ background: color }} />{PHOTOSHOOT_STATUS_LABELS[item.status]}</span></td>
                    <td style={{ textAlign: 'center' }}>{item.foto_count || '—'}</td>
                    <td><div className="text-truncate" style={{ maxWidth: 150 }} title={item.notes}>{item.notes || '—'}</div></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {item.contact_phone && <button className="btn btn-sm mkt-wa-btn" onClick={() => handleWhatsApp(item.contact_phone, item.mobil)} title="WhatsApp">💬</button>}
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editItem ? 'Edit Photoshoot' : 'Jadwal Photoshoot Baru'}</div><button className="modal-close" onClick={resetForm}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Mobil *</label><input value={form.mobil} onChange={e => setForm({ ...form, mobil: e.target.value })} placeholder="e.g. BMW M4" /></div>
                <div className="form-group"><label className="form-label">Lokasi</label><input value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} placeholder="e.g. PIK" /></div>
                <div className="form-group"><label className="form-label">Tanggal</label><input type="date" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{Object.entries(PHOTOSHOOT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Contact Name</label><input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Contact Phone</label><input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="08xx" /></div>
                <div className="form-group"><label className="form-label">Jumlah Foto</label><input type="number" value={form.foto_count} onChange={e => setForm({ ...form, foto_count: parseInt(e.target.value) || 0 })} /></div>
                <div className="form-group full-width"><label className="form-label">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={resetForm}>Batal</button><button className="btn btn-primary" onClick={handleSubmit}>{editItem ? 'Simpan' : 'Tambah'}</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
