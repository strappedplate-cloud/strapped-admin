'use client';

import React from 'react';
import { Reseller } from '@/lib/types';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';

export default function ResellersPage() {
  const { data: session } = useSession();
  
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/resellers')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [resellers, setResellers] = React.useState<Reseller[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<Reseller | null>(null);
  const [search, setSearch] = React.useState('');
  const [form, setForm] = React.useState({ nama: '', contact_name: '', no_hp: '', alamat: '', channel: '', notes: '' });
  const [waMessage, setWaMessage] = React.useState('Halo kak, ini dari Strapped! Mau follow up orderan kakak 🙏');

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
    (r.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
    r.channel.toLowerCase().includes(search.toLowerCase())
  );

  const buildWaUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const encodedMsg = encodeURIComponent(waMessage);
    return `https://wa.me/${formattedPhone}?text=${encodedMsg}`;
  };


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
    setForm({ nama: '', contact_name: '', no_hp: '', alamat: '', channel: '', notes: '' });
    fetchResellers();

  };

  const handleEdit = (r: Reseller) => {
    setForm({ nama: r.nama, contact_name: r.contact_name || '', no_hp: r.no_hp, alamat: r.alamat, channel: r.channel, notes: r.notes });
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
        <button className="btn btn-primary" onClick={() => { setForm({ nama: '', contact_name: '', no_hp: '', alamat: '', channel: '', notes: '' }); setEditing(null); setShowForm(true); }}>✚ Tambah Reseller</button>

      </div>

      <div className="search-bar" style={{ marginBottom: 20, position: 'relative' }}>
        <span className="search-bar-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
        <input placeholder="Cari nama, channel..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
      </div>

      {/* WhatsApp Message Template */}
      <div className="wa-message-box" style={{
        marginBottom: 20,
        padding: 16,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>WhatsApp Message Template</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>Pesan ini akan dikirim saat klik tombol WA di kolom Aksi</span>
        </div>
        <textarea
          value={waMessage}
          onChange={e => setWaMessage(e.target.value)}
          placeholder="Ketik template pesan WhatsApp di sini..."
          style={{
            width: '100%',
            minHeight: 60,
            resize: 'vertical',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        />
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
                <th>Nama Bengkel</th>
                <th>Nama PIC</th>
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
                  <td>{r.contact_name || '—'}</td>
                  <td>{r.no_hp || '—'}</td>
                  <td>{r.channel || '—'}</td>

                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.alamat || '—'}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(r)} title="Edit Reseller">✏️</button>
                      {r.no_hp && (
                        <a 
                          href={buildWaUrl(r.no_hp)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remind via Whatsapp"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                        </a>
                      )}
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
                    <label className="form-label">Nama Bengkel *</label>
                    <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required placeholder="Nama bengkel/store" />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Nama PIC</label>
                    <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Nama penanggung jawab" />
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
              <div className="modal-footer" style={{ justifyContent: editing ? 'space-between' : 'flex-end' }}>
                {editing && (
                  <button type="button" className="btn btn-danger" onClick={() => { handleDelete(editing.id); setShowForm(false); }}>🗑 Hapus</button>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary">{editing ? '💾 Simpan' : '✚ Tambah'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
