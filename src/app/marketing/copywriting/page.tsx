'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';

export default function CopywritingPage() {
  const { data: session } = useSession();
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/marketing/copywriting')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [type, setType] = React.useState<'instagram_caption' | 'article'>('instagram_caption');
  const [mobil, setMobil] = React.useState('');
  const [context, setContext] = React.useState('');
  const [tone, setTone] = React.useState('premium, modern, automotive enthusiast');
  const [language, setLanguage] = React.useState('id');
  const [additionalInfo, setAdditionalInfo] = React.useState('');
  const [wordCount, setWordCount] = React.useState('500');
  const [result, setResult] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [history, setHistory] = React.useState<{ type: string; mobil: string; result: string; timestamp: string }[]>([]);

  const handleGenerate = async () => {
    if (!context) return;
    setLoading(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/marketing/ai/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, mobil, context, tone, language, additional_info: additionalInfo, word_count: type === 'article' ? wordCount : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Terjadi kesalahan'); return; }
      setResult(data.result);
      setHistory(prev => [{ type, mobil, result: data.result, timestamp: new Date().toLocaleTimeString('id-ID') }, ...prev.slice(0, 9)]);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const btn = document.activeElement as HTMLButtonElement;
    if (btn) { const orig = btn.textContent; btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = orig; }, 1500); }
  };

  return (
    <main className="main-content">
      <div className="page-header">
        <h1 className="page-title">✍️ AI Copywriting</h1>
        <p className="page-subtitle">Generate caption Instagram & artikel dengan AI Claude</p>
      </div>

      <div className="mkt-ai-layout">
        {/* Input Panel */}
        <div className="mkt-ai-panel">
          <div className="mkt-ai-panel-header">
            <span className="mkt-ai-panel-icon">🤖</span>
            <span>Input</span>
          </div>
          <div className="mkt-ai-panel-body">
            <div className="form-group">
              <label className="form-label">Tipe Konten</label>
              <div className="mkt-type-selector">
                <button className={`mkt-type-btn ${type === 'instagram_caption' ? 'active' : ''}`} onClick={() => setType('instagram_caption')}>📷 Caption Instagram</button>
                <button className={`mkt-type-btn ${type === 'article' ? 'active' : ''}`} onClick={() => setType('article')}>📝 Artikel</button>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Mobil</label>
                <input value={mobil} onChange={e => setMobil(e.target.value)} placeholder="e.g. Toyota Supra MK5" />
              </div>
              <div className="form-group">
                <label className="form-label">Bahasa</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{type === 'instagram_caption' ? 'Deskripsi Konten *' : 'Topik Artikel *'}</label>
              <textarea value={context} onChange={e => setContext(e.target.value)} placeholder={type === 'instagram_caption' ? 'Deskripsikan konten foto/video...' : 'Topik yang ingin dibahas...'} rows={3} />
            </div>

            <div className="form-group">
              <label className="form-label">Tone</label>
              <input value={tone} onChange={e => setTone(e.target.value)} placeholder="premium, modern, sporty..." />
            </div>

            {type === 'article' && (
              <div className="form-group">
                <label className="form-label">Target Kata</label>
                <input value={wordCount} onChange={e => setWordCount(e.target.value)} placeholder="500" />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Info Tambahan</label>
              <textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} placeholder="Promo, event, detail spesifik..." rows={2} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '12px 20px', fontSize: 14 }} onClick={handleGenerate} disabled={loading || !context}>
              {loading ? '⏳ Generating...' : '✨ Generate dengan AI'}
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mkt-ai-panel mkt-ai-result-panel">
          <div className="mkt-ai-panel-header">
            <span className="mkt-ai-panel-icon">📄</span>
            <span>Hasil</span>
            {result && <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => copyToClipboard(result)}>📋 Copy</button>}
          </div>
          <div className="mkt-ai-panel-body">
            {error && <div className="mkt-ai-error">⚠️ {error}</div>}
            {loading && (
              <div className="mkt-ai-loading">
                <div className="mkt-ai-loading-dots"><span></span><span></span><span></span></div>
                <p>Claude sedang menulis...</p>
              </div>
            )}
            {result && !loading && (
              <div className="mkt-ai-result-text">{result}</div>
            )}
            {!result && !loading && !error && (
              <div className="mkt-ai-empty">
                <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
                <p>Hasil generate akan muncul di sini</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Isi form di sebelah kiri, lalu klik Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="sidebar-section-label">Riwayat Generate</div>
          <div className="mkt-history-list">
            {history.map((h, i) => (
              <div key={i} className="mkt-history-item" onClick={() => setResult(h.result)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{h.type === 'instagram_caption' ? '📷 Caption' : '📝 Artikel'} — {h.mobil || 'General'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{h.timestamp}</span>
                </div>
                <div className="text-truncate" style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: '100%' }}>{h.result.slice(0, 100)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
