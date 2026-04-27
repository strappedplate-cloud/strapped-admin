'use client';

import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/AccessDenied';

interface FileData {
  name: string;
  qty: number;
  size: string;
  folder: string;
}

export default function ProductionParsePage() {
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [prodNumber, setProdNumber] = useState('');
  const [output1, setOutput1] = useState('');
  const [output2, setOutput2] = useState('');
  const [error, setError] = useState('');
  
  const [parsedData, setParsedData] = useState<{
    folders: Record<string, string[]>;
    files: FileData[];
  } | null>(null);

  if (session?.user && (session.user as any).role !== 'admin' && !(session.user as any).permissions?.includes('/production-parse')) {
    if ((session.user as any).role !== 'admin') {
        return <main className="main-content"><AccessDenied /></main>;
    }
  }

  const parseZip = async (file: File) => {
    setLoading(true);
    setError('');
    
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const files: FileData[] = [];
      const folders: Record<string, string[]> = {};

      const zipName = file.name.replace(/\.zip$/i, '');
      setProdNumber(zipName);
      
      for (const [path, zipFile] of Object.entries(contents.files)) {
        if (zipFile.dir) continue;
        
        const pathParts = path.split('/');
        if (pathParts.length < 2) continue;

        const folderName = pathParts[pathParts.length - 2];
        const fileName = pathParts[pathParts.length - 1];
        
        if (fileName.startsWith('.') || fileName.startsWith('__') || fileName.includes('/.')) continue;

        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const parts = nameWithoutExt.split('_');
        
        let qty = 0;
        let size = folderName;

        if (parts.length >= 2) {
          qty = parseInt(parts[1]) || 0;
        }

        files.push({
          name: fileName,
          qty,
          size,
          folder: folderName
        });

        if (!folders[folderName]) folders[folderName] = [];
        folders[folderName].push(fileName);
      }

      setParsedData({ folders, files });
      generateOutputs(zipName, folders, files, driveLink);
    } catch (err) {
      console.error(err);
      setError('Failed to parse ZIP file. Please ensure it is a valid ZIP.');
    } finally {
      setLoading(false);
    }
  };

  const generateOutputs = (name: string, folders: Record<string, string[]>, files: FileData[], link: string) => {
    const sizeTotals: Record<string, number> = {};
    Object.keys(folders).forEach(size => {
      sizeTotals[size] = files.filter(f => f.folder === size).reduce((sum, f) => sum + f.qty, 0);
    });

    let text1 = '';
    
    if (name.startsWith('PP-')) {
      text1 = `${name}\n\n`;
      text1 += `Job : Akrilik Clear 2 mm - Print UV (Mirror)\n`;
      text1 += `Total :\n`;
      Object.keys(sizeTotals).sort().forEach(size => {
        text1 += `${size}: ${sizeTotals[size]}\n`;
      });
      text1 += `\nNote :\n`;
      text1 += `-. Masking kertas akriliknya buka sisi yang di print aja.\n`;
      text1 += `-. Print jangan miring & buram/blur.\n`;
      text1 += `-. Ukuran plat sesuai dengan order\n`;
      text1 += `-. Setiap sisi ada bleed 1 mm, cetak ukuran tetap sesuai seperti file.`;
    } else if (name.startsWith('PL-') && name.endsWith('A')) {
      text1 = `Client : Strapped\n`;
      text1 += `Kode Order : ${name}\n`;
      text1 += `Job : Akrilik Clear 2 mm - Plat Rounded 10 mm - Print UV (Mirror)\n\n`;
      text1 += `Ukuran & Qty :\n`;
      Object.keys(sizeTotals).sort().forEach(size => {
        text1 += `${size}: total ${sizeTotals[size]} pada folder ${size}\n`;
      });
      text1 += `\nLink gdrive : ${link || '[link drive]'}\n`;
      text1 += `Note : Pinggirnya yang rapih, bersih dan ring-nya yang rapet.`;
    } else if (name.startsWith('PL-') && name.endsWith('K')) {
      text1 = `Client : Strapped\n`;
      text1 += `Kode Order : ${name}\n`;
      text1 += `Job : Keychain 2 Sisi, Print Dalam\n\n`;
      text1 += `Ukuran & Qty :\n`;
      Object.keys(sizeTotals).sort().forEach(size => {
        text1 += `${size}: total ${sizeTotals[size]} pada folder ${size}\n`;
      });
      text1 += `\nLink gdrive : ${link || '[link drive]'}\n`;
      text1 += `Note : Pinggirnya yang rapih, bersih dan ring-nya yang rapet.`;
    } else {
      text1 = `${name}\n\nJob : Custom Order\nTotal :\n`;
      Object.keys(sizeTotals).sort().forEach(size => {
        text1 += `${size}: total ${sizeTotals[size]}\n`;
      });
      text1 += ``;
    }

    let text2 = `[${name}]\n`;
    Object.keys(folders).sort().forEach(size => {
      text2 += `${size}:\n`;
      folders[size].forEach(file => {
        text2 += `-. ${file}\n`;
      });
      text2 += `\n`;
    });
    text2 = text2.trim();

    setOutput1(text1);
    setOutput2(text2);
  };

  const handleUpdate = () => {
    if (parsedData) {
      generateOutputs(prodNumber, parsedData.folders, parsedData.files, driveLink);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed')) {
      parseZip(file);
    } else {
      setError('Please drop a valid ZIP file.');
    }
  }, [driveLink]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseZip(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <main className="main-content">
      <div className="page-header">
        <h1 className="page-title">Production Parse</h1>
        <p className="page-subtitle">Generate production text orders from ZIP file structure</p>
      </div>

      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Production Number</label>
            <input 
              type="text" 
              placeholder="Auto-filled from ZIP..." 
              value={prodNumber}
              onChange={e => {
                setProdNumber(e.target.value);
                if (parsedData) {
                  generateOutputs(e.target.value, parsedData.folders, parsedData.files, driveLink);
                }
              }}
              className="input-premium"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Google Drive Link</label>
            <input 
              type="text" 
              placeholder="Paste link here..." 
              value={driveLink}
              onChange={e => {
                setDriveLink(e.target.value);
                if (parsedData) {
                  generateOutputs(prodNumber, parsedData.folders, parsedData.files, e.target.value);
                }
              }}
              className="input-premium"
            />
          </div>
          <div className="form-group full-width">
            <label className="form-label">Manual File List (Optional - one file per line)</label>
            <textarea 
              placeholder="If you don't have a ZIP, paste file names here (format: Size/Filename or just Filename)..." 
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
                  
                  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
                  const parts = nameWithoutExt.split('_');
                  let qty = 0;
                  if (parts.length >= 2) qty = parseInt(parts[1]) || 0;
                  
                  files.push({ name: fileName, qty, size: folderName, folder: folderName });
                  if (!folders[folderName]) folders[folderName] = [];
                  folders[folderName].push(fileName);
                });
                
                setParsedData({ folders, files });
                generateOutputs(prodNumber, folders, files, driveLink);
              }}
              style={{ minHeight: '80px', fontSize: '12px' }}
              className="input-premium"
            />
          </div>
        </div>

        <div 
          onDragOver={e => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const url = e.dataTransfer.getData('text/plain');
            if (url && (url.startsWith('http') || url.includes('drive.google.com'))) {
              setDriveLink(url);
              if (parsedData) {
                generateOutputs(prodNumber, parsedData.folders, parsedData.files, url);
              }
              return;
            }
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed')) {
              parseZip(file);
            } else {
              setError('Please drop a valid ZIP file or Google Drive link.');
            }
          }}
          style={{
            border: '2px dashed var(--border-hover)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            cursor: 'pointer',
            transition: 'all var(--transition)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
          onClick={() => document.getElementById('zip-upload')?.click()}
        >
          <div style={{ fontSize: '48px' }}>📦</div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
              {loading ? 'Processing...' : 'Drop ZIP file here or click to upload'}
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              Structure: [Size]/[Nama] [Design]_[Qty]_[Size].ext
            </p>
          </div>
          <input 
            id="zip-upload"
            type="file" 
            accept=".zip" 
            style={{ display: 'none' }} 
            onChange={onFileChange}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            className={`btn btn-primary ${!parsedData ? 'disabled' : ''}`} 
            onClick={handleUpdate}
            style={{ 
              padding: '12px 32px', 
              fontSize: '15px', 
              width: '100%',
              maxWidth: '300px',
              opacity: !parsedData ? 0.5 : 1,
              cursor: !parsedData ? 'not-allowed' : 'pointer'
            }}
            disabled={!parsedData}
          >
            ✨ Generate Production Text
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--status-red)', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {output1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
            <div className="card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1px' }}>TEXT ORDER (EXTERNAL)</h3>
                <button className="btn btn-primary btn-sm" onClick={() => copyToClipboard(output1)}>Copy Text</button>
              </div>
              <div className="output-box">
                {output1}
              </div>
            </div>

            <div className="card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--status-indigo)', letterSpacing: '1px' }}>CATATAN PRODUKSI (INTERNAL)</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(output2)}>Copy Text</button>
              </div>
              <div className="output-box">
                {output2}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .card-premium {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }
        .input-premium {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: white;
          width: 100%;
        }
        .input-premium:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .output-box {
          background: var(--bg-primary); 
          padding: 20px; 
          border-radius: var(--radius-md); 
          font-size: 13px; 
          line-height: 1.6; 
          white-space: pre-wrap;
          font-family: 'JetBrains Mono', 'Monaco', monospace;
          border: 1px solid var(--border);
          color: var(--text-primary);
        }
      `}</style>
    </main>
  );
}
