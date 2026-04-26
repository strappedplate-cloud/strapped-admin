'use client';

import React from 'react';
import { Reseller } from '@/lib/types';

export default function ResellersPage() {
  const [resellers, setResellers] = React.useState<Reseller[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Reseller | null>(null);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({ nama: '', no_hp: '', alamat: '', channel: '', notes: '' });
  const [loading, setLoading] = React.useState(true);

  const fetchResellers = async () => {
    try {
      const res = await fetch('/api/resellers');
      if (res.ok) setResellers(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { fetchResellers(); }, []);

  const filtered = resellers.filter(r =>
    r.nama.toLowerCase().includes(search.toLowerCase()) ||
    r.channel.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;

    if (editing) {
      await fetch('/api/resellers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...form }),
      });
    } else {
      await fetch('/api/resellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    setEditing(null);
    setForm({ nama: '', no_hp: '', alamat: '', channel: '', notes: '' });
    fetchResellers();
  };

  const handleEdit = (r: Reseller) => {
    setForm({ nama: r.nama, no_hp: r.no_hp, alamat: r.alamat, channel: r.channel, notes: r.notes });
    setEditing(r);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus reseller ini?')) return;
    await fetch(`/api/resellers?id=${id}`, { method: 'DELETE' });
    fetchResellers();
  };

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Reseller List</h1>
          <p className="page-subtitle">{resellers.length} resellers terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ nama: '', no_hp: '', alamat: '', channel: '', notes: '' }); setEditing(null); setShowForm(true); }}>✚ Tambah Reseller</button>
      </div>

      <div className="search-bar" style={{ marginBottom: 20 }}>
        <span className="search-bar-icon">🔍</span>
        <input placeholder="Cari nama, channel..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading...</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">Belum ada reseller</div>
          <div className="empty-state-text">Tambahkan reseller pertama untuk mulai tracking.</div>
        </div>
      ) : (
        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No. HP</th>
                <th>Channel</th>
                <th>Alamat</th>
                <th>Notes</th>
                <th style={{ width: 100 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.nama}</td>
                  <td>{r.no_hp || '—'}</td>
                  <td>{r.channel || '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.alamat || '—'}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(r)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Reseller' : 'Tambah Reseller'}</div>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Nama *</label>
                    <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required placeholder="Nama reseller" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. HP</label>
                    <input value={form.no_hp} onChange={e => setForm({ ...form, no_hp: e.target.value })} placeholder="08xxxxxxxxxx" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Channel</label>
                    <input value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} placeholder="e.g. Shopee, WA" />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Alamat</label>
                    <textarea value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} placeholder="Alamat reseller..." />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{editing ? '💾 Simpan' : '✚ Tambah'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
