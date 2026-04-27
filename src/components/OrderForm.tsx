'use client';

import React from 'react';
import { Order, ORDER_STATUS_LABELS, OrderStatus, PaymentStatus } from '@/lib/types';
import { formatOrderNumber } from '@/lib/utils';


interface OrderFormProps {
  onSubmit: (data: Partial<Order>) => void;
  onCancel: () => void;
  initialData?: Partial<Order>;
}

export default function OrderForm({ onSubmit, onCancel, initialData }: OrderFormProps) {
  const [form, setForm] = React.useState<Partial<Order>>({
    nama: '',
    channel_pembelian: '',
    payment_status: 'Have Not Paid',
    nomor_plat: '',
    form_detail: '',
    reseller_name: '',
    ukuran_plat: '',

    jenis_bundling: 'Non-Bundle',
    qty: 1,
    finishing: '',
    revision_note: '',
    status: 'not_started' as OrderStatus,
    editor_name: '',
    production_number: '',
    nama_penerima: '',
    no_hp: '',
    alamat_pengiriman: '',
    // Metadata
    tanggal_pembelian: new Date().toISOString().split('T')[0],
    urutan_order: 1,
    notes: '',
    ...initialData,
  });

  const [resellers, setResellers] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/resellers')
      .then(res => res.json())
      .then(data => setResellers(data))
      .catch(err => console.error('Failed to fetch resellers:', err));
  }, []);

  const handleResellerChange = (resellerName: string) => {
    const reseller = resellers.find(r => r.nama === resellerName);
    if (reseller) {
      setForm(prev => ({
        ...prev,
        reseller_name: resellerName,
        nama_penerima: reseller.contact_name || reseller.nama,
        no_hp: reseller.no_hp,
        alamat_pengiriman: `${reseller.nama}\n${reseller.alamat}`.trim()
      }));
    } else {
      setForm(prev => ({ ...prev, reseller_name: resellerName }));
    }
  };



  const [showQuickInput, setShowQuickInput] = React.useState(false);
  const [quickInputText, setQuickInputText] = React.useState('');

  const handleQuickParse = () => {
    if (!quickInputText.trim()) return;
    
    const lines = quickInputText.split('\n').map(l => l.trim());
    const getVal = (key: string) => {
      const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase()));
      if (!line) return '';
      return line.split(':')[1]?.trim() || '';
    };

    // Parsing Nama & Channel
    const namaFromAddress = getVal('Nama');
    const igLine = lines.find(l => l.toLowerCase().includes('order by ig'));
    const igUser = igLine ? igLine.split('@')[1]?.trim() : '';
    
    const nama = igUser ? `@${igUser}` : namaFromAddress;
    const channel = igLine ? 'Instagram' : (quickInputText.toLowerCase().includes('whatsapp') ? 'WhatsApp' : 'Instagram');

    // Parsing Detail
    const ukuran = getVal('Ukuran');
    const qtyRaw = getVal('Qty');
    let qty = 1;
    if (qtyRaw.toLowerCase().includes('double') || qtyRaw.toLowerCase().includes('2 pcs')) qty = 2;
    else if (qtyRaw.toLowerCase().includes('single') || qtyRaw.toLowerCase().includes('1 pcs')) qty = 1;

    const platRaw = getVal('Nomor Plat');
    const platClean = platRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const notes = getVal('Notes');

    // Detail block (from Ukuran to Notes)
    const detailStartIndex = lines.findIndex(l => l.toLowerCase().startsWith('ukuran'));
    const detailEndIndex = lines.findIndex(l => l.toLowerCase().startsWith('notes'));
    let formDetail = '';
    if (detailStartIndex !== -1 && detailEndIndex !== -1) {
      formDetail = lines.slice(detailStartIndex, detailEndIndex + 1).join('\n');
    }

    setForm(prev => ({
      ...prev,
      nama: nama || prev.nama,
      channel_pembelian: channel || prev.channel_pembelian,
      nomor_plat: platClean || prev.nomor_plat,
      form_detail: formDetail || prev.form_detail,
      ukuran_plat: ukuran || prev.ukuran_plat,
      qty: qty || prev.qty,
      finishing: notes || prev.finishing,
      nama_penerima: namaFromAddress || prev.nama_penerima,
      no_hp: getVal('No. HP') || prev.no_hp,
      alamat_pengiriman: getVal('Alamat Lengkap') || prev.alamat_pengiriman,
      status: 'not_started' as OrderStatus,
    }));
    
    setQuickInputText('');
    setShowQuickInput(false);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama?.trim()) return alert('Nama harus diisi');
    onSubmit(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-title">Order Baru</div>
          <div style={{ marginLeft: 'auto', marginRight: '12px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowQuickInput(!showQuickInput)}>
              {showQuickInput ? 'Close Quick Input' : '⚡ Quick Input'}
            </button>
          </div>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {showQuickInput && (
              <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-soft)' }}>
                <label className="form-label" style={{ marginBottom: '8px', color: 'var(--accent)', display: 'block' }}>Paste Form Order Di Sini</label>
                <textarea 
                  value={quickInputText}
                  onChange={e => setQuickInputText(e.target.value)}
                  placeholder="Paste form dari IG/WA..."
                  style={{ minHeight: '120px', marginBottom: '12px', fontSize: '12px' }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleQuickParse} style={{ width: '100%' }}>
                  Parse & Isi Form Otomatis
                </button>
              </div>
            )}
            <div className="form-grid">

              {/* 1. Nama */}
              <div className="form-group">
                <label className="form-label">1. Nama *</label>
                <input value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} required placeholder="Nama customer" />
              </div>

              {/* 2. Channel */}
              <div className="form-group">
                <label className="form-label">2. Channel</label>
                <select value={form.channel_pembelian || ''} onChange={e => setForm({ ...form, channel_pembelian: e.target.value })}>
                  <option value="">Pilih channel...</option>
                  <option value="Tokopedia">Tokopedia</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Shopee">Shopee</option>
                  <option value="TikTok Shop">TikTok Shop</option>
                  <option value="Tokopedia/Tiktok">Tokopedia/Tiktok</option>
                  <option value="Offline Pickup (COD)">Offline Pickup (COD)</option>
                  <option value="Offline Pickup">Offline Pickup</option>
                  <option value="Reseller">Reseller</option>
                  <option value="Other">Other</option>
                </select>

              </div>

              {/* Conditional Reseller Name */}
              {form.channel_pembelian === 'Reseller' && (
                <div className="form-group">
                  <label className="form-label">Nama Reseller</label>
                  <select 
                    value={form.reseller_name || ''} 
                    onChange={e => handleResellerChange(e.target.value)}
                  >
                    <option value="">Pilih reseller...</option>
                    {resellers.map(r => (
                      <option key={r.id} value={r.nama}>{r.nama}</option>
                    ))}
                  </select>
                </div>
              )}



              {/* 3. Payment */}
              <div className="form-group">
                <label className="form-label">3. Payment</label>
                <select value={form.payment_status || 'Have Not Paid'} onChange={e => setForm({ ...form, payment_status: e.target.value as PaymentStatus })}>
                  <option value="Paid">Paid</option>
                  <option value="DP">DP</option>
                  <option value="Have Not Paid">Have Not Paid</option>
                </select>
              </div>

              {/* Date Selection */}
              <div className="form-group">
                <label className="form-label">Tanggal Order</label>
                <input type="date" value={form.tanggal_pembelian || ''} onChange={e => setForm({ ...form, tanggal_pembelian: e.target.value })} />
              </div>




              {/* 4. Order Detail */}
              <div className="form-group full-width" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 8 }}>
                <label className="form-label" style={{ fontSize: 16, fontWeight: 700 }}>4. Order Detail</label>
              </div>
              <div className="form-group">
                <label className="form-label">4A. Design</label>
                <input value={form.nomor_plat || ''} onChange={e => setForm({ ...form, nomor_plat: e.target.value })} placeholder="e.g. B 1234 ABC" />
              </div>

              <div className="form-group full-width">
                <label className="form-label">4B. Form Detail</label>
                <textarea value={form.form_detail || ''} onChange={e => setForm({ ...form, form_detail: e.target.value })} placeholder="Detail order..." style={{ minHeight: '80px' }} />
              </div>

              <div className="form-group">
                <label className="form-label">4C. Size (Ukuran Plat)</label>
                <select value={form.ukuran_plat || ''} onChange={e => setForm({ ...form, ukuran_plat: e.target.value })}>
                  <option value="">Pilih ukuran...</option>
                  <option value="Mobil - Indo">Mobil - Indo</option>
                  <option value="Mobil - Japan">Mobil - Japan</option>
                  <option value="Mobil - Euro">Mobil - Euro</option>
                  <option value="Motor - Indo">Motor - Indo</option>
                  <option value="Keychain">Keychain</option>
                  <option value="Custom Size">Custom Size</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">4D. Bundling</label>
                <select value={form.jenis_bundling || ''} onChange={e => setForm({ ...form, jenis_bundling: e.target.value })}>
                  <option value="Non-Bundle">Non-Bundle</option>
                  <option value="Velcro">Velcro</option>
                  <option value="Keychain">Keychain</option>
                  <option value="Velcro+Keychain">Velcro+Keychain</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">4E. Qty</label>
                <input type="number" min={1} value={form.qty || 1} onChange={e => setForm({ ...form, qty: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="form-group">
                <label className="form-label">4F. Finishing</label>
                <input value={form.finishing || ''} onChange={e => setForm({ ...form, finishing: e.target.value })} placeholder="e.g. Matte" />
              </div>

              {/* 5. Revision Note */}
              <div className="form-group full-width">
                <label className="form-label">5. Revision Note</label>
                <textarea value={form.revision_note || ''} onChange={e => setForm({ ...form, revision_note: e.target.value })} placeholder="Catatan revisi..." />
              </div>

              {/* 6. Progress */}
              <div className="form-group">
                <label className="form-label">6. Progress</label>
                <select value={form.status || 'not_started'} onChange={e => setForm({ ...form, status: e.target.value as OrderStatus })}>
                  {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 7. Editor */}
              <div className="form-group">
                <label className="form-label">7. Editor</label>
                <input value={form.editor_name || ''} onChange={e => setForm({ ...form, editor_name: e.target.value })} placeholder="Nama editor" />
              </div>

              {/* 8. Production Number */}
              <div className="form-group">
                <label className="form-label">8. Production Number</label>
                <input value={form.production_number || ''} onChange={e => setForm({ ...form, production_number: e.target.value })} placeholder="e.g. PN-001" />
              </div>

              {/* 9. Shipping Note */}
              <div className="form-group full-width" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 8, marginTop: 16 }}>
                <label className="form-label" style={{ fontSize: 16, fontWeight: 700 }}>9. Shipping Note</label>
              </div>
              <div className="form-group">
                <label className="form-label">9A. Nama Penerima</label>
                <input value={form.nama_penerima || ''} onChange={e => setForm({ ...form, nama_penerima: e.target.value })} placeholder="Nama penerima paket" />
              </div>
              <div className="form-group">
                <label className="form-label">9B. No. HP</label>
                <input value={form.no_hp || ''} onChange={e => setForm({ ...form, no_hp: e.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="form-group full-width">
                <label className="form-label">9C. Alamat</label>
                <textarea value={form.alamat_pengiriman || ''} onChange={e => setForm({ ...form, alamat_pengiriman: e.target.value })} placeholder="Alamat lengkap pengiriman..." />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Batal</button>
            <button type="submit" className="btn btn-primary">✚ Tambah Order</button>
          </div>
        </form>
      </div>
    </div>
  );
}
