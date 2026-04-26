'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function AccessDenied() {
  const pathname = usePathname();
  const [requested, setRequested] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleRequest = async () => {
    setLoading(true);
    const res = await fetch('/api/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname })
    });
    if (res.ok) {
      setRequested(true);
    }
    setLoading(false);
  };

  return (
    <div className="empty-state" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="empty-state-icon" style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
      <h2 className="empty-state-title" style={{ fontSize: '24px', marginBottom: '12px' }}>Akses Terbatas</h2>
      <p className="empty-state-text" style={{ maxWidth: '400px', margin: '0 auto 32px', color: 'var(--text-secondary)' }}>
        Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi Admin atau ajukan permintaan akses di bawah ini.
      </p>
      
      {requested ? (
        <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '12px 24px', borderRadius: '8px', fontWeight: 600 }}>
          ✓ Permintaan akses telah dikirim ke Admin (Ocu)
        </div>
      ) : (
        <button 
          className="btn btn-primary" 
          onClick={handleRequest} 
          disabled={loading}
          style={{ padding: '12px 32px', fontSize: '16px' }}
        >
          {loading ? 'Mengirim...' : 'Ajukan Permintaan Akses'}
        </button>
      )}
    </div>
  );
}
