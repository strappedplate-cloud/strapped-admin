'use client';

import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';
import { Order } from '@/lib/types';

// ─── PP Tab Types ────────────────────────────────────────────────────────────
interface FileData {
  name: string;
  qty: number;
  size: string;
  folder: string;
}

// ─── PL Tab Types ────────────────────────────────────────────────────────────
const PL_JOBS = [
  'Akrilik Clear 2 mm - Plat Rounded 10 mm - Print UV (Mirror)',
  'Sticker Chromo + Kiss Cut',
  'Sticker Vinyl Transparan + Kiss Cut',
  'BW + Cut',
  'BW + Trim Line',
  'Keychain 2 Sisi, Print Dalam',
] as const;

type PlJob = typeof PL_JOBS[number];

const SIZE_OPTIONS: Record<string, string[]> = {
  'Akrilik Clear 2 mm - Plat Rounded 10 mm - Print UV (Mirror)': [
    '520 x 110', '460 x 135', '327 x 160', '327 x 160 (Hole)', '304.8 x 152.4', '275 x 115',
  ],
  'Sticker Chromo + Kiss Cut': ['485 x 325'],
  'Sticker Vinyl Transparan + Kiss Cut': ['485 x 325'],
  'BW + Cut': ['485 x 325'],
  'BW + Trim Line': ['485 x 325'],
  'Keychain 2 Sisi, Print Dalam': ['30 x 61.3', '20 x 68.148', '17 x 80.364'],
};

const JOB_NOTES: Record<string, string> = {
  'Akrilik Clear 2 mm - Plat Rounded 10 mm - Print UV (Mirror)': 'Buka kertas coklat bergambar-nya, sisain yang kertas coklat polos. Print jangan miring & buram/blur',
  'Sticker Chromo + Kiss Cut': 'Tolong di-potong jadi 3 kotak seperti sebelumnya.',
  'Sticker Vinyl Transparan + Kiss Cut': 'Tolong di-potong jadi per 4 seperti dibiasa.',
  'Keychain 2 Sisi, Print Dalam': 'Pinggirnya yang rapih, bersih dan ring-nya yang rapet.',
  'BW + Cut': '-',
  'BW + Trim Line': '-',
};

interface SizeQtyRow {
  id: string;
  size: string;
  customSize: string;
  qty: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ProductionParsePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'PP' | 'PL'>('PP');

  // PP Tab State
  const [ppLoading, setPpLoading] = useState(false);
  const [ppDriveLink, setPpDriveLink] = useState('');
  const [ppProdNumber, setPpProdNumber] = useState('');
  const [ppOutput1, setPpOutput1] = useState('');
  const [ppOutput2, setPpOutput2] = useState('');
  const [ppError, setPpError] = useState('');
  const [ppParsedData, setPpParsedData] = useState<{
    folders: Record<string, string[]>;
    files: FileData[];
  } | null>(null);

  // PL Tab State
  const [plOrderNumber, setPlOrderNumber] = useState('');
  const [plJob, setPlJob] = useState<PlJob>(PL_JOBS[0]);
  const [plRows, setPlRows] = useState<SizeQtyRow[]>([
    { id: '1', size: '', customSize: '', qty: '' },
  ]);
  const [plDriveLink, setPlDriveLink] = useState('');
  const [plOutput, setPlOutput] = useState('');

  // Order Picker State
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [pickerProdCode, setPickerProdCode] = useState('');
  const [designApprovedOrders, setDesignApprovedOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [pickerSaving, setPickerSaving] = useState(false);

  // ── Access Control ──────────────────────────────────────────────────────────
  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/production-parse')) {
    if ((session.user as any).role !== 'admin') {
      return <main className="main-content"><AccessDenied /></main>;
    }
  }

  // ── PP Logic ────────────────────────────────────────────────────────────────
  const ppParseZip = async (file: File) => {
    setPpLoading(true);
    setPpError('');
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const files: FileData[] = [];
      const folders: Record<string, string[]> = {};
      const zipName = file.name.replace(/\.zip$/i, '');
      setPpProdNumber(zipName);

      for (const [path, zipFile] of Object.entries(contents.files)) {
        if (zipFile.dir) continue;
        const pathParts = path.split('/');
        if (pathParts.length < 2) continue;
        const folderName = pathParts[pathParts.length - 2];
        const fileName = pathParts[pathParts.length - 1];
        if (fileName.startsWith('.') || fileName.startsWith('__') || fileName.includes('/.') || fileName.includes('File Cutting')) continue;
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const parts = nameWithoutExt.split('_');
        let qty = 0;
        if (parts.length >= 2) qty = parseInt(parts[1]) || 0;
        files.push({ name: fileName, qty, size: folderName, folder: folderName });
        if (!folders[folderName]) folders[folderName] = [];
        folders[folderName].push(fileName);
      }

      setPpParsedData({ folders, files });
      ppGenerateOutputs(zipName, folders, files, ppDriveLink);
      // Open order picker after ZIP parsed
      await openOrderPicker(zipName);
    } catch (err) {
      console.error(err);
      setPpError('Failed to parse ZIP file. Please ensure it is a valid ZIP.');
    } finally {
      setPpLoading(false);
    }
  };

  const ppGenerateOutputs = (name: string, folders: Record<string, string[]>, files: FileData[], link: string) => {
    const sizeTotals: Record<string, number> = {};
    Object.keys(folders).forEach(size => {
      sizeTotals[size] = files.filter(f => f.folder === size).reduce((sum, f) => sum + f.qty, 0);
    });

    let text1 = '';
    text1 = `${name}\n\n`;
    text1 += `Job : Akrilik Clear 2 mm - Print UV (Mirror)\n`;
    text1 += `Total :\n`;
    Object.keys(sizeTotals).sort().forEach(size => {
      const qty = sizeTotals[size];
      text1 += `${size} : ${qty} ${qty === 1 ? 'pc' : 'pcs'}\n`;
    });
    text1 += `\nNote :\n`;
    text1 += `-. Masking kertas akriliknya buka sisi yang di print aja.\n`;
    text1 += `-. Print jangan miring & buram/blur.\n`;
    text1 += `-. Ukuran plat sesuai dengan order\n`;
    text1 += `-. Setiap sisi ada bleed 1 mm, cetak ukuran tetap sesuai seperti file.`;

    let text2 = `[${name}]\n`;
    Object.keys(folders).sort().forEach(size => {
      text2 += `${size}:\n`;
      folders[size].forEach(file => {
        text2 += `-. ${file.replace(/\.png$/i, '')}\n`;
      });
      text2 += `\n`;
    });
    text2 = text2.trim();

    setPpOutput1(text1);
    setPpOutput2(text2);
  };

  const ppHandleUpdate = () => {
    if (ppParsedData) ppGenerateOutputs(ppProdNumber, ppParsedData.folders, ppParsedData.files, ppDriveLink);
  };

  const ppOnDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const url = e.dataTransfer.getData('text/plain');
    if (url && (url.startsWith('http') || url.includes('drive.google.com'))) {
      setPpDriveLink(url);
      if (ppParsedData) ppGenerateOutputs(ppProdNumber, ppParsedData.folders, ppParsedData.files, url);
      return;
    }
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed')) {
      ppParseZip(file);
    } else {
      setPpError('Please drop a valid ZIP file or Google Drive link.');
    }
  }, [ppDriveLink, ppParsedData, ppProdNumber]);

  const ppOnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) ppParseZip(file);
  };

  // ── PL Logic ────────────────────────────────────────────────────────────────
  const plAddRow = () => {
    setPlRows(prev => [...prev, { id: Date.now().toString(), size: '', customSize: '', qty: '' }]);
  };

  const plRemoveRow = (id: string) => {
    setPlRows(prev => prev.filter(r => r.id !== id));
  };

  const plUpdateRow = (id: string, field: keyof SizeQtyRow, value: string) => {
    setPlRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const plGetNote = (job: PlJob): string => JOB_NOTES[job] || '-';

  const plGetSizes = (job: PlJob): string[] => SIZE_OPTIONS[job] || [];

  const plGenerate = async () => {
    const note = plGetNote(plJob);
    let text = `Client : Strapped\n`;
    text += `Kode Order : ${plOrderNumber || '[Order Number]'}\n`;
    text += `Job : ${plJob}\n\n`;
    text += `Ukuran & Qty :\n`;
    plRows.forEach(row => {
      const sizeLabel = row.size === 'custom' ? row.customSize : row.size;
      const qty = parseInt(row.qty) || 0;
      if (sizeLabel) {
        text += `${sizeLabel} : ${qty} ${qty === 1 ? 'pc' : 'pcs'}\n`;
      }
    });
    text += `\nLink gdrive : ${plDriveLink || '[link drive]'}\n`;
    text += `Note : ${note}`;
    setPlOutput(text);
    // Open order picker after PL text generated
    await openOrderPicker(plOrderNumber);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // ── Order Picker Logic ──────────────────────────────────────────────────────
  const openOrderPicker = async (prodCode: string) => {
    setPickerProdCode(prodCode);
    setSelectedOrderIds(new Set());
    try {
      const res = await fetch('/api/orders?filter=ongoing');
      if (res.ok) {
        const all: Order[] = await res.json();
        setDesignApprovedOrders(all.filter(o => o.status === 'design_approved'));
      }
    } catch {}
    setShowOrderPicker(true);
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePickerConfirm = async () => {
    if (selectedOrderIds.size === 0) { setShowOrderPicker(false); return; }
    setPickerSaving(true);
    
    try {
      await fetch('/api/orders/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: Array.from(selectedOrderIds), 
          updates: { status: 'production', production_number: pickerProdCode } 
        }),
      });
    } catch (err) {
      console.error(err);
    }
    
    setPickerSaving(false);
    setShowOrderPicker(false);
    setSelectedOrderIds(new Set());
  };

  const sizeOptions = plGetSizes(plJob);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="main-content">
      <div className="page-header">
        <h1 className="page-title">Production Parse</h1>
        <p className="page-subtitle">Generate production text orders</p>
      </div>

      {/* Tab Bar */}
      <div className="pp-tabs">
        <button
          className={`pp-tab ${activeTab === 'PP' ? 'active' : ''}`}
          onClick={() => setActiveTab('PP')}
        >
          PP
        </button>
        <button
          className={`pp-tab ${activeTab === 'PL' ? 'active' : ''}`}
          onClick={() => setActiveTab('PL')}
        >
          PL
        </button>
      </div>

      {/* ── PP Tab ── */}
      {activeTab === 'PP' && (
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Production Number</label>
              <input
                type="text"
                placeholder="Auto-filled from ZIP..."
                value={ppProdNumber}
                onChange={e => {
                  setPpProdNumber(e.target.value);
                  if (ppParsedData) ppGenerateOutputs(e.target.value, ppParsedData.folders, ppParsedData.files, ppDriveLink);
                }}
                className="input-premium"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Google Drive Link</label>
              <input
                type="text"
                placeholder="Paste link here..."
                value={ppDriveLink}
                onChange={e => {
                  setPpDriveLink(e.target.value);
                  if (ppParsedData) ppGenerateOutputs(ppProdNumber, ppParsedData.folders, ppParsedData.files, e.target.value);
                }}
                className="input-premium"
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Manual File List (Optional — one file per line)</label>
              <textarea
                placeholder="Format: Size/Filename or just Filename..."
                onChange={e => {
                  const text = e.target.value;
                  if (!text.trim()) return;
                  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                  const files: FileData[] = [];
                  const folders: Record<string, string[]> = {};
                  lines.forEach(line => {
                    let folderName = 'Default';
                    let fileName = line;
                    if (line.includes('/')) {
                      const parts = line.split('/');
                      folderName = parts[0];
                      fileName = parts[1];
                    }
                    if (fileName.includes('File Cutting')) return;
                    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
                    const parts = nameWithoutExt.split('_');
                    let qty = 0;
                    if (parts.length >= 2) qty = parseInt(parts[1]) || 0;
                    files.push({ name: fileName, qty, size: folderName, folder: folderName });
                    if (!folders[folderName]) folders[folderName] = [];
                    folders[folderName].push(fileName);
                  });
                  setPpParsedData({ folders, files });
                  ppGenerateOutputs(ppProdNumber, folders, files, ppDriveLink);
                }}
                style={{ minHeight: '80px', fontSize: '12px' }}
                className="input-premium"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={ppOnDrop}
            style={{
              border: '2px dashed var(--border-hover)', borderRadius: 'var(--radius-lg)',
              padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)',
              cursor: 'pointer', transition: 'all var(--transition)', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '12px',
            }}
            onClick={() => document.getElementById('pp-zip-upload')?.click()}
          >
            <div style={{ fontSize: '48px' }}>📦</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                {ppLoading ? 'Processing...' : 'Drop ZIP file here or click to upload'}
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
                Structure: [Size]/[Nama] [Design]_[Qty]_[Size].ext
              </p>
            </div>
            <input id="pp-zip-upload" type="file" accept=".zip" style={{ display: 'none' }} onChange={ppOnFileChange} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className={`btn btn-primary ${!ppParsedData ? 'disabled' : ''}`}
              onClick={ppHandleUpdate}
              style={{ padding: '12px 32px', fontSize: '15px', width: '100%', maxWidth: '300px', opacity: !ppParsedData ? 0.5 : 1, cursor: !ppParsedData ? 'not-allowed' : 'pointer' }}
              disabled={!ppParsedData}
            >
              ✨ Generate Production Text
            </button>
          </div>

          {ppError && (
            <div style={{ color: 'var(--status-red)', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {ppError}
            </div>
          )}

          {ppOutput1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
              <div className="card-premium">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1px' }}>TEXT ORDER (EXTERNAL)</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => copyToClipboard(ppOutput1)}>Copy Text</button>
                </div>
                <div className="output-box">{ppOutput1}</div>
              </div>
              <div className="card-premium">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--status-indigo)', letterSpacing: '1px' }}>CATATAN PRODUKSI (INTERNAL)</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(ppOutput2)}>Copy Text</button>
                </div>
                <div className="output-box">{ppOutput2}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PL Tab ── */}
      {activeTab === 'PL' && (
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-premium">
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1px', marginBottom: '20px' }}>FORM ORDER PL</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Order Number */}
              <div className="form-group">
                <label className="form-label">Kode Order (Nama Folder Google Drive)</label>
                <input
                  type="text"
                  placeholder="Contoh: PL-206K"
                  value={plOrderNumber}
                  onChange={e => setPlOrderNumber(e.target.value)}
                  className="input-premium"
                />
              </div>

              {/* Job */}
              <div className="form-group">
                <label className="form-label">Job</label>
                <select
                  value={plJob}
                  onChange={e => {
                    setPlJob(e.target.value as PlJob);
                    setPlRows([{ id: '1', size: '', customSize: '', qty: '' }]);
                  }}
                  className="input-premium"
                >
                  {PL_JOBS.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {/* Size & Qty Table */}
              <div className="form-group">
                <label className="form-label">Ukuran & Qty</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, padding: '0 4px' }}>UKURAN</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, padding: '0 4px' }}>QTY</span>
                    <span />
                  </div>

                  {plRows.map(row => (
                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 40px', gap: '8px', alignItems: 'center' }}>
                      {/* Size */}
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <select
                          value={row.size}
                          onChange={e => plUpdateRow(row.id, 'size', e.target.value)}
                          className="input-premium"
                          style={{ padding: '10px 12px', fontSize: '13px' }}
                        >
                          <option value="">Pilih ukuran...</option>
                          {sizeOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="custom">Custom (manual input)</option>
                        </select>
                        {row.size === 'custom' && (
                          <input
                            type="text"
                            placeholder="Masukkan ukuran..."
                            value={row.customSize}
                            onChange={e => plUpdateRow(row.id, 'customSize', e.target.value)}
                            className="input-premium"
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                          />
                        )}
                      </div>
                      {/* Qty */}
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={row.qty}
                        onChange={e => plUpdateRow(row.id, 'qty', e.target.value)}
                        className="input-premium"
                        style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'center' }}
                      />
                      {/* Remove */}
                      <button
                        onClick={() => plRemoveRow(row.id)}
                        disabled={plRows.length === 1}
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                          color: plRows.length === 1 ? 'var(--text-tertiary)' : 'var(--status-red)',
                          cursor: plRows.length === 1 ? 'not-allowed' : 'pointer',
                          width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', transition: 'all var(--transition)',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={plAddRow}
                    style={{
                      marginTop: '4px', padding: '8px', background: 'var(--accent-soft)',
                      border: '1px dashed var(--accent)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      transition: 'all var(--transition)',
                    }}
                  >
                    + Tambah Baris
                  </button>
                </div>
              </div>

              {/* Drive Link */}
              <div className="form-group">
                <label className="form-label">Link Google Drive</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={plDriveLink}
                  onChange={e => setPlDriveLink(e.target.value)}
                  className="input-premium"
                />
              </div>

              {/* Auto Note Preview */}
              <div className="form-group">
                <label className="form-label">Note (otomatis)</label>
                <div style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '12px 16px',
                  fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic',
                }}>
                  {plGetNote(plJob)}
                </div>
              </div>

              {/* Generate Button */}
              <button
                className="btn btn-primary"
                onClick={plGenerate}
                style={{ padding: '12px 32px', fontSize: '15px', alignSelf: 'center', width: '100%', maxWidth: '300px' }}
              >
                ✨ Generate Text Order
              </button>
            </div>
          </div>

          {/* PL Output */}
          {plOutput && (
            <div className="card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1px' }}>TEXT ORDER (EXTERNAL)</h3>
                <button className="btn btn-primary btn-sm" onClick={() => copyToClipboard(plOutput)}>Copy Text</button>
              </div>
              <div className="output-box">{plOutput}</div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        /* ... existing styles ... */
        .pp-tabs { display:flex; gap:4px; margin-bottom:24px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-lg); padding:6px; width:fit-content; }
        .pp-tab { padding:10px 24px; border-radius:var(--radius-md); border:none; background:none; color:var(--text-secondary); font-size:14px; font-weight:600; cursor:pointer; transition:all var(--transition); }
        .pp-tab.active { background:var(--accent); color:white; box-shadow:0 2px 8px var(--accent-soft); }
        .pp-tab:not(.active):hover { background:var(--bg-hover); color:var(--text-primary); }
        .card-premium { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; box-shadow:var(--shadow-sm); }
        .input-premium { background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px; color:white; width:100%; }
        .input-premium:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); outline:none; }
        select.input-premium option { background:var(--bg-card); color:var(--text-primary); }
        .output-box { background:var(--bg-primary); padding:20px; border-radius:var(--radius-md); font-size:13px; line-height:1.6; white-space:pre-wrap; font-family:'JetBrains Mono','Monaco',monospace; border:1px solid var(--border); color:var(--text-primary); }
        /* Picker */
        .picker-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .picker-modal { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); width:100%; max-width:560px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,0.5); }
        .picker-header { padding:20px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
        .picker-body { padding:16px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:8px; }
        .picker-footer { padding:16px 24px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:10px; }
        .picker-order-row { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:var(--radius-md); border:1px solid var(--border); cursor:pointer; transition:all var(--transition); }
        .picker-order-row:hover { border-color:var(--accent); background:var(--accent-soft); }
        .picker-order-row.selected { border-color:var(--accent); background:var(--accent-soft); }
        .picker-checkbox { width:18px; height:18px; border-radius:4px; border:2px solid var(--border); background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all var(--transition); }
        .picker-order-row.selected .picker-checkbox { background:var(--accent); border-color:var(--accent); color:white; font-size:11px; }
      `}</style>

      {/* ── Order Picker Modal ── */}
      {showOrderPicker && (
        <div className="picker-overlay" onClick={() => setShowOrderPicker(false)}>
          <div className="picker-modal" onClick={e => e.stopPropagation()}>
            <div className="picker-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>Pindahkan ke Production</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Kode Produksi: <strong style={{ color: 'var(--accent)' }}>{pickerProdCode || '(kosong)'}</strong>
                </div>
              </div>
              <button
                onClick={() => setShowOrderPicker(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            </div>

            <div className="picker-body">
              {designApprovedOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                  <div>Tidak ada order dengan status Design Approved</div>
                </div>
              ) : (
                designApprovedOrders.map(o => {
                  const isSelected = selectedOrderIds.has(o.id);
                  return (
                    <div
                      key={o.id}
                      className={`picker-order-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleOrderSelection(o.id)}
                    >
                      <div className="picker-checkbox">{isSelected && '✓'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>{o.nama}</div>
                        <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '2px' }}>{o.nomor_plat || 'NO DESIGN'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {o.ukuran_plat} · {o.jenis_bundling || 'Non-Bundle'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="picker-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowOrderPicker(false)}>Lewati</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handlePickerConfirm}
                disabled={pickerSaving || selectedOrderIds.size === 0}
                style={{ opacity: selectedOrderIds.size === 0 ? 0.5 : 1 }}
              >
                {pickerSaving ? '⏳ Menyimpan...' : `✅ Pindahkan ${selectedOrderIds.size > 0 ? `(${selectedOrderIds.size})` : ''} ke Production`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
