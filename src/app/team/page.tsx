'use client';

import React from 'react';
import OrderModal from '@/components/OrderModal';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';
import { AccessRequest, User } from '@/lib/types';

const PERMISSIONS_LIST = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/orders/ongoing', label: 'Ongoing Orders' },
  { path: '/orders/past', label: 'Past Orders' },
  { path: '/packing', label: 'Packing List' },
  { path: '/resellers', label: 'Reseller List' },
  { path: '/team', label: 'Team Management' },
];

export default function TeamPage() {
  const { data: session } = useSession();
  const [users, setUsers] = React.useState<Partial<User>[]>([]);
  const [requests, setRequests] = React.useState<AccessRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    email: '',
    no_hp: '',
    role: 'member',
    permissions: []
  });

  const fetchData = async () => {
    setLoading(true);
    const [uRes, rRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/access-requests')
    ]);
    if (uRes.ok) setUsers(await uRes.json());
    if (rRes.ok) setRequests(await rRes.json());
    setLoading(false);
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (user: Partial<User>) => {
    setEditingId(user.id || null);
    setFormData({
      ...user,
      password: '', // don't show password
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingId;
    const url = isNew ? '/api/users' : `/api/users/${editingId}`;
    const method = isNew ? 'POST' : 'PATCH';

    const payload = { ...formData };
    if (!payload.password && !isNew) {
      delete payload.password; // don't update password if empty when editing
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setShowForm(false);
      setFormData({ name: '', username: '', password: '', email: '', no_hp: '', role: 'member', permissions: [] });
      setEditingId(null);
      fetchData();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleRequestAction = async (id: string, status: 'approved' | 'rejected') => {
    const res = await fetch(`/api/access-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchData();
  };

  const togglePermission = (path: string) => {
    const current = formData.permissions || [];
    if (current.includes(path)) {
      setFormData({ ...formData, permissions: current.filter(p => p !== path) });
    } else {
      setFormData({ ...formData, permissions: [...current, path] });
    }
  };

  // Only Admin can view this page ideally
  if (session?.user && (session.user as any).role !== 'admin') {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <main className="main-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Kelola akses dan akun tim Strapped</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({ name: '', username: '', password: '', email: '', no_hp: '', role: 'member', permissions: [] });
          setShowForm(true);
        }}>✚ Tambah Anggota</button>
      </div>

      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔔</span> Permintaan Akses Pending ({pendingRequests.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {pendingRequests.map(req => (
              <div key={req.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'white' }}>@{req.username}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Minta akses ke: <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{PERMISSIONS_LIST.find(p => p.path === req.path)?.label || req.path}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleRequestAction(req.id, 'approved')}>✓</button>
                  <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRequestAction(req.id, 'rejected')}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Anggota' : 'Anggota Baru'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Nama Lengkap</label>
                  <input className="form-input" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: 'white' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Username</label>
                  <input className="form-input" required value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: 'white' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Password {editingId && '(Kosongkan jika tidak ingin ganti)'}</label>
                  <input className="form-input" type="password" required={!editingId} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: 'white' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Role</label>
                  <select className="form-input" value={formData.role || 'member'} onChange={e => setFormData({...formData, role: e.target.value as 'admin'|'member'})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: 'white' }}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Email</label>
                  <input className="form-input" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: 'white' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Nomor WhatsApp</label>
                  <input className="form-input" value={formData.no_hp || ''} onChange={e => setFormData({...formData, no_hp: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '6px', color: 'white' }} />
                </div>
              </div>

              <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'block' }}>Akses Menu (Permissions)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {PERMISSIONS_LIST.map(p => (
                    <label key={p.path} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px 12px', background: formData.permissions?.includes(p.path) ? 'var(--accent-soft)' : 'transparent', borderRadius: '8px', border: '1px solid', borderColor: formData.permissions?.includes(p.path) ? 'var(--accent)' : 'var(--border)', transition: 'all 0.2s' }}>
                      <div style={{ position: 'relative', width: '18px', height: '18px' }}>
                        <input 
                          type="checkbox" 
                          checked={formData.permissions?.includes(p.path) || false}
                          onChange={() => togglePermission(p.path)}
                          style={{ cursor: 'pointer', width: '100%', height: '100%', opacity: 0, position: 'absolute', zIndex: 2 }}
                        />
                        <div style={{ width: '18px', height: '18px', border: '2px solid', borderColor: formData.permissions?.includes(p.path) ? 'var(--accent)' : 'var(--text-tertiary)', borderRadius: '4px', background: formData.permissions?.includes(p.path) ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {formData.permissions?.includes(p.path) && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: formData.permissions?.includes(p.path) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} style={{ padding: '10px 24px' }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>Simpan Akun</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Role</th>
                <th>Kontak</th>
                <th>Akses Menu</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                  <td>@{u.username}</td>
                  <td>
                    <span className="badge" style={{ background: u.role === 'admin' ? 'var(--accent-soft)' : 'var(--bg-tertiary)', color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {u.role?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email || '-'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{u.no_hp || '-'}</div>
                  </td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {u.permissions?.map(p => (
                        <span key={p} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                          {PERMISSIONS_LIST.find(x => x.path === p)?.label || p}
                        </span>
                      ))}
                      {(!u.permissions || u.permissions.length === 0) && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No access</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleEdit(u)}>Edit</button>
                    {u.username !== 'ocu' && (
                      <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(u.id!)}>Hapus</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
