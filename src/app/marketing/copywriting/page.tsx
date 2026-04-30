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

  // Image state
  const [imageBase64, setImageBase64] = React.useState('');
  const [imageMediaType, setImageMediaType] = React.useState('');
  const [imagePreview, setImagePreview] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Format foto tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.');
      return;
    }

    // Validate file size (max 5MB for API)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran foto maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 data (remove "data:image/jpeg;base64," prefix)
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setImageMediaType(file.type);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageBase64('');
    setImageMediaType('');
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!context) return;
    setLoading(true); setError(''); setResult('');
    try {
      const payload: any = { type, mobil, context, tone, language, additional_info: additionalInfo };
      if (type === 'article') payload.word_count = wordCount;
      if (imageBase64) {
        payload.image_base64 = imageBase64;
        payload.image_media_type = imageMediaType;
      }

      const res = await fetch('/api/marketing/ai/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

            {/* Photo Upload */}
            <div className="form-group">
              <label className="form-label">📸 Foto Referensi (opsional)</label>
              {!imagePreview ? (
                <div
                  className="mkt-photo-upload"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                  onDragLeave={e => e.currentTarget.classList.remove('dragover')}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                    const file = e.dataTransfer.files[0];
                    if (file && fileInputRef.current) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      fileInputRef.current.files = dt.files;
                      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Klik atau drag foto ke sini</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>JPG, PNG, WebP, GIF • Maks 5MB</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>AI akan analisis foto untuk caption yang lebih akurat</div>
                </div>
              ) : (
                <div className="mkt-photo-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button className="mkt-photo-remove" onClick={removeImage} title="Hapus foto">✕</button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
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
              {loading ? '⏳ Generating...' : `✨ Generate ${imageBase64 ? '(+ Foto)' : ''}`}
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
                <p>Claude sedang {imageBase64 ? 'menganalisis foto & ' : ''}menulis...</p>
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
