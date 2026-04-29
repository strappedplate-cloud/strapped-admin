'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';

const OCCASIONS = [
  { value: 'idul_fitri', label: '🕌 Idul Fitri', theme: 'hijau, emas, islami' },
  { value: 'natal', label: '🎄 Natal', theme: 'merah, hijau, salju' },
  { value: 'tahun_baru', label: '🎆 Tahun Baru', theme: 'emas, kembang api, mewah' },
  { value: 'imlek', label: '🧧 Imlek', theme: 'merah, emas, lampion' },
  { value: 'kemerdekaan', label: '🇮🇩 17 Agustus', theme: 'merah putih, nasional' },
  { value: 'valentines', label: '❤️ Valentine', theme: 'merah, pink, romantis' },
  { value: 'mothers_day', label: '🌸 Hari Ibu', theme: 'pink, hangat, elegan' },
  { value: 'new_product', label: '🚀 Launch Produk', theme: 'futuristik, bold, premium' },
  { value: 'promo', label: '🔥 Promo/Sale', theme: 'bold, urgent, menarik' },
  { value: 'custom', label: '✨ Custom', theme: '' },
];

export default function StoryGeneratorPage() {
  const { data: session } = useSession();
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/marketing/generator')) {
    return <main className="main-content"><AccessDenied /></main>;
  }

  const [occasion, setOccasion] = React.useState('');
  const [customOccasion, setCustomOccasion] = React.useState('');
  const [theme, setTheme] = React.useState('');
  const [brandMessage, setBrandMessage] = React.useState('Strapped - Premium Plate Frame');
  const [style, setStyle] = React.useState('modern minimalist');
  const [includePromo, setIncludePromo] = React.useState('');
  const [result, setResult] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleOccasionChange = (val: string) => {
    setOccasion(val);
    const found = OCCASIONS.find(o => o.value === val);
    if (found && found.theme) setTheme(found.theme);
  };

  const handleGenerate = async () => {
    const occ = occasion === 'custom' ? customOccasion : OCCASIONS.find(o => o.value === occasion)?.label || occasion;
    if (!occ) return;
    setLoading(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/marketing/ai/story-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion: occ, theme, brand_message: brandMessage, style, include_promo: includePromo }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Terjadi kesalahan'); return; }
      setResult(data.result);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="main-content">
      <div className="page-header">
        <h1 className="page-title">🎨 Story Generator AI</h1>
        <p className="page-subtitle">Generate konsep & copy Instagram Story untuk hari raya & event</p>
      </div>

      {/* Occasion Quick Select */}
      <div className="mkt-occasion-grid">
        {OCCASIONS.map(occ => (
          <button key={occ.value} className={`mkt-occasion-card ${occasion === occ.value ? 'active' : ''}`} onClick={() => handleOccasionChange(occ.value)}>
            <span style={{ fontSize: 28 }}>{occ.label.split(' ')[0]}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{occ.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>

      <div className="mkt-ai-layout">
        {/* Input Panel */}
        <div className="mkt-ai-panel">
          <div className="mkt-ai-panel-header">
            <span className="mkt-ai-panel-icon">🎨</span>
            <span>Konfigurasi Story</span>
          </div>
          <div className="mkt-ai-panel-body">
            {occasion === 'custom' && (
              <div className="form-group">
                <label className="form-label">Nama Occasion *</label>
                <input value={customOccasion} onChange={e => setCustomOccasion(e.target.value)} placeholder="e.g. Anniversary Brand ke-3" />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Theme / Vibe</label>
              <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="e.g. dark luxury, gold accent" />
            </div>

            <div className="form-group">
              <label className="form-label">Brand Message</label>
              <input value={brandMessage} onChange={e => setBrandMessage(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Style Visual</label>
              <select value={style} onChange={e => setStyle(e.target.value)}>
                <option value="modern minimalist">Modern Minimalist</option>
                <option value="bold graphic">Bold & Graphic</option>
                <option value="elegant luxury">Elegant Luxury</option>
                <option value="playful colorful">Playful & Colorful</option>
                <option value="dark moody">Dark & Moody</option>
                <option value="clean professional">Clean Professional</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Promo (opsional)</label>
              <input value={includePromo} onChange={e => setIncludePromo(e.target.value)} placeholder="e.g. Diskon 20% semua produk" />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '12px 20px', fontSize: 14 }} onClick={handleGenerate} disabled={loading || (!occasion || (occasion === 'custom' && !customOccasion))}>
              {loading ? '⏳ Generating...' : '🎨 Generate Story Concept'}
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="mkt-ai-panel mkt-ai-result-panel">
          <div className="mkt-ai-panel-header">
            <span className="mkt-ai-panel-icon">✨</span>
            <span>Konsep Story</span>
            {result && <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => copyToClipboard(result)}>📋 Copy All</button>}
          </div>
          <div className="mkt-ai-panel-body">
            {error && <div className="mkt-ai-error">⚠️ {error}</div>}
            {loading && (
              <div className="mkt-ai-loading">
                <div className="mkt-ai-loading-dots"><span></span><span></span><span></span></div>
                <p>AI sedang membuat konsep...</p>
              </div>
            )}
            {result && !loading && (
              <div className="mkt-ai-result-text">{result}</div>
            )}
            {!result && !loading && !error && (
              <div className="mkt-ai-empty">
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
                <p>Pilih occasion di atas, atur konfigurasi, lalu Generate</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>AI akan membuat headline, CTA, color palette, dan layout suggestion</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
