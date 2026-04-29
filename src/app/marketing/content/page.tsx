'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';
import {
  MarketingContent,
  ContentStatus,
  CONTENT_STATUS_LABELS,
  CONTENT_STATUS_COLORS,
} from '@/lib/marketing-types';

export default function MarketingContentPage() {
  const { data: session } = useSession();

  if (
    session?.user &&
    (session.user as any).role !== 'admin' &&
    !(session.user as any).permissions?.includes('/marketing/content')
  ) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [items, setItems] = React.useState<MarketingContent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editItem, setEditItem] = React.useState<MarketingContent | null>(null);

  const [form, setForm] = React.useState({
    nama_konten: '',
    mobil: '',
    status: 'briefing' as ContentStatus,
    link_foto: '',
    caption: '',
    platform: 'instagram' as 'instagram' | 'tiktok' | 'both',
    assigned_to: '',
    notes: '',
    publish_date: '',
  });

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/marketing/content');
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(item => {
    const matchSearch =
      item.nama_konten.toLowerCase().includes(search.toLowerCase()) ||
      item.mobil.toLowerCase().includes(search.toLowerCase()) ||
      item.assigned_to.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const resetForm = () => {
    setForm({
      nama_konten: '', mobil: '', status: 'briefing', link_foto: '',
      caption: '', platform: 'instagram', assigned_to: '', notes: '', publish_date: '',
    });
    setEditItem(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.nama_konten) return;
    try {
      if (editItem) {
        await fetch(`/api/marketing/content/${editItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/marketing/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      resetForm();
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item: MarketingContent) => {
    setForm({
      nama_konten: item.nama_konten,
      mobil: item.mobil,
      status: item.status,
      link_foto: item.link_foto,
      caption: item.caption,
      platform: item.platform,
      assigned_to: item.assigned_to,
      notes: item.notes,
      publish_date: item.publish_date,
    });
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus konten ini?')) return;
    await fetch(`/api/marketing/content/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">📸 Content Pipeline</h1>
          <p className="page-subtitle">{items.length} total konten • Track semua progress editing & publish</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          ✚ Konten Baru
        </button>
      </div>

      {/* Status Overview Cards */}
      <div className="mkt-stat-grid">
        {Object.entries(CONTENT_STATUS_LABELS).map(([key, label]) => {
          const count = statusCounts[key] || 0;
          const color = CONTENT_STATUS_COLORS[key as ContentStatus];
          return (
            <button
              key={key}
              className={`mkt-stat-card ${filterStatus === key ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              style={{ '--stat-color': color } as React.CSSProperties}
            >
              <div className="mkt-stat-count">{count}</div>
              <div className="mkt-stat-label">{label}</div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>🔍</span>
          <input
            placeholder="Cari nama konten, mobil, PIC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%', height: 40, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'white' }}
          />
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading...</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📸</div>
          <div className="empty-state-title">Belum ada konten</div>
          <div className="empty-state-text">Klik &quot;Konten Baru&quot; untuk menambahkan konten marketing.</div>
        </div>
      ) : (
        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Konten</th>
                <th>Mobil</th>
                <th>Progress</th>
                <th>Link Foto</th>
                <th>Caption</th>
                <th>Platform</th>
                <th>PIC</th>
                <th>Publish</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const color = CONTENT_STATUS_COLORS[item.status];
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nama_konten}</td>
                    <td>
                      <span className="mkt-car-badge">{item.mobil || '—'}</span>
                    </td>
                    <td>
                      <span className="status-badge" style={{ background: `${color}18`, color }}>
                        <span className="status-dot" style={{ background: color }} />
                        {CONTENT_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td>
                      {item.link_foto ? (
                        <a href={item.link_foto} target="_blank" rel="noopener noreferrer" className="mkt-link-btn">
                          🔗 Lihat
                        </a>
                      ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: 200 }} title={item.caption}>
                        {item.caption || <span style={{ color: 'var(--text-tertiary)' }}>Belum ada</span>}
                      </div>
                    </td>
                    <td>
                      <span className="mkt-platform-badge" data-platform={item.platform}>
                        {item.platform === 'instagram' ? '📷 IG' : item.platform === 'tiktok' ? '🎵 TT' : '📷🎵'}
                      </span>
                    </td>
                    <td>{item.assigned_to || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {item.publish_date ? new Date(item.publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
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

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit Konten' : 'Tambah Konten Baru'}</div>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nama Konten *</label>
                  <input value={form.nama_konten} onChange={e => setForm({ ...form, nama_konten: e.target.value })} placeholder="e.g. Review Civic Type R" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobil</label>
                  <input value={form.mobil} onChange={e => setForm({ ...form, mobil: e.target.value })} placeholder="e.g. Honda Civic Type R" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ContentStatus })}>
                    {Object.entries(CONTENT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value as any })}>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Link Foto / Drive</label>
                  <input value={form.link_foto} onChange={e => setForm({ ...form, link_foto: e.target.value })} placeholder="https://drive.google.com/..." />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Caption</label>
                  <textarea value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} placeholder="Caption untuk posting..." rows={3} />
                </div>
                <div className="form-group">
                  <label className="form-label">PIC / Assigned To</label>
                  <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Nama PIC" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Publish</label>
                  <input type="date" value={form.publish_date} onChange={e => setForm({ ...form, publish_date: e.target.value })} />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan..." rows={2} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={resetForm}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {editItem ? 'Simpan Perubahan' : 'Tambah Konten'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
