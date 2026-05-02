import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { Order } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// ─── Colours ──────────────────────────────────────────────────
const BLUE  = rgb(11/255, 83/255, 148/255); // exact match for template #0b5394
const WHITE = rgb(1, 1, 1);
const DARK  = BLUE; // Changed from rgb(0.1, 0.1, 0.1) as requested
const GRAY  = rgb(0.4, 0.4, 0.4);

// ─── Template coordinates (from grid calibration, page 596×842) ──
const TABLE_X = 38;
const TABLE_R = 558;
const TABLE_W = TABLE_R - TABLE_X;
const C = { no: 50, item: 70, price: 315, qty: 410, subtotal: 470, right: 546 };

const ROW_H  = 36;
const FOOT_H = 20;
// Table header bottom y (data rows start here going down)
const TABLE_DATA_TOP = 575;

// ─── Price tables ─────────────────────────────────────────────
const PRICES: Record<string, Record<string, number>> = {
  retail: {
    'Plate-Single-Mobil': 250000, 'Plate-Double-Mobil': 350000,
    'Plate-Single-Mobil-Bundle Velcro': 315000, 'Plate-Double-Mobil-Bundle Velcro': 450000,
    'Plate-Single-Mobil-Bundle Keychain': 300000, 'Plate-Double-Mobil-Bundle Keychain': 400000,
    'Plate-Single-Mobil-Bundle Velcro+Keychain': 365000, 'Plate-Double-Mobil-Bundle Velcro+Keychain': 500000,
    'Plate-Single-Motor': 175000, 'Plate-Double-Motor': 250000,
    'Plate-Single-Motor-Bundle Keychain': 225000, 'Plate-Double-Motor-Bundle Keychain': 300000,
    'Keychain': 55000, 'Velcro-Single': 90000, 'Velcro-Double': 150000,
    'FRAMED-Chrome': 550000, 'FRAMED-Rose Gold': 1000000, 'FRAMED-Black Chrome': 1100000,
  },
  reseller: {
    'Plate-Single-Mobil': 210000, 'Plate-Double-Mobil': 300000,
    'Plate-Single-Mobil-Bundle Velcro': 285000, 'Plate-Double-Mobil-Bundle Velcro': 400000,
    'Plate-Single-Mobil-Bundle Keychain': 250000, 'Plate-Double-Mobil-Bundle Keychain': 340000,
    'Plate-Single-Mobil-Bundle Velcro+Keychain': 335000, 'Plate-Double-Mobil-Bundle Velcro+Keychain': 440000,
    'Plate-Single-Motor': 150000, 'Plate-Double-Motor': 210000,
    'Plate-Single-Motor-Bundle Keychain': 190000, 'Plate-Double-Motor-Bundle Keychain': 250000,
    'Keychain': 45000, 'Velcro-Single': 75000, 'Velcro-Double': 100000,
    'FRAMED-Chrome': 500000, 'FRAMED-Rose Gold': 900000, 'FRAMED-Black Chrome': 1000000,
  },
};

function lookupPrice(customerType: string, vehicle: string, qty: string, bundle: string): number {
  const table = PRICES[customerType] ?? PRICES.retail;
  let key = `Plate-${qty}-${vehicle}`;
  if (bundle) key += `-${bundle}`;
  return table[key] ?? 0;
}

function rpFmt(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

function sanitize(s: string) {
  return (s || '')
    .replace(/[\u2011-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x00-\x7F]/g, '');
}

function wrapText(text: string, maxW: number, font: PDFFont, size: number): string[] {
  const s = sanitize(text); if (!s) return ['-'];
  const words = s.split(' ');
  const lines: string[] = []; let cur = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (font.widthOfTextAtSize(cur + ' ' + w, size) <= maxW) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  lines.push(cur);
  return lines;
}

interface OrderLineData {
  col1: string;
  col2?: string;
  price: number;
  qtyDisplay: string;
  subtotal: number;
}

interface InvoicePayload {
  orders: any[];
  customerType: 'retail' | 'reseller';
  bengkelName?: string;
  perOrder: Record<string, {
    productType: string;
    vehicleType: string;
    priceOverride?: number;
  }>;
  extras: { product: string; price: string; qty: string }[];
  shippingService: string;
  shippingTotal: string;
  invoiceNo: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: InvoicePayload = await req.json();
    const { orders, customerType, bengkelName, perOrder, extras, shippingService, shippingTotal, invoiceNo } = body;
    if (!orders?.length) return NextResponse.json({ error: 'No orders' }, { status: 400 });

    const templatePath = path.join(process.cwd(), 'public', 'invoice-template.pdf');
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    let page = pdfDoc.getPage(0);

    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const reg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const txt = (text: string, x: number, y: number, size: number, font: PDFFont, color: any, targetPage: PDFPage = page) =>
      targetPage.drawText(text, { x, y, size, font, color });
    const rtxt = (text: string, x: number, y: number, size: number, font: PDFFont, color: any, targetPage: PDFPage = page) =>
      targetPage.drawText(text, { x: x - font.widthOfTextAtSize(text, size), y, size, font, color });
    const rect = (x: number, y: number, w: number, h: number, col: any, targetPage: PDFPage = page) =>
      targetPage.drawRectangle({ x, y, width: w, height: h, color: col });
    const line = (x1: number, y1: number, x2: number, y2: number, col: any = GRAY, th: number = 0.5, targetPage: PDFPage = page) =>
      targetPage.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th, color: col });

    // ── 1. White-out header placeholders, write real values ──
    const firstOrder = orders[0];
    const invoiceDate = firstOrder.tanggal_pembelian
      ? new Date(firstOrder.tanggal_pembelian).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    rect(350, 717, 230, 20, BLUE); // cover [Date] area
    rtxt(invoiceDate, TABLE_R, 722, 10.5, reg, WHITE);

    rect(350, 702, 230, 20, BLUE); // cover [Invoice_No] area
    rtxt(invoiceNo, TABLE_R, 707, 10.5, reg, WHITE);

    // ── 2. White-out EVERYTHING below Issued To ───────────────────
    rect(0, 0, 596, 655, WHITE); 
    const recipientName  = sanitize(firstOrder.nama_penerima || firstOrder.nama);
    const recipientPhone = sanitize(firstOrder.no_hp || '');
    
    if (customerType === 'reseller' && bengkelName) {
      txt(`${recipientName} - ${recipientPhone}`, C.no, 640, 15, bold, DARK);
      txt(sanitize(bengkelName), C.no, 622, 11, reg, GRAY);
    } else {
      txt(`${recipientName} - ${recipientPhone}`, C.no, 630, 15, bold, DARK);
    }

    // ── 3. Build row data ────────────────────────────────────
    const rows: OrderLineData[] = [];
    for (const ord of orders) {
      const conf = perOrder[ord.id] || { productType: 'Plate', vehicleType: 'Mobil' };
      const baseProduct = conf.productType;
      
      const parts = (ord.produk || '').split('-').map((s: string) => s.trim());
      const rawQty = ord.qty || '1';
      const actualQty = parseInt(String(rawQty)) || 1;
      let qtyString = rawQty;
      if (['Single', 'Double', 'Triple', 'Quadruple'].includes(parts[parts.length - 1])) {
        qtyString = parts.pop()!;
      }

      const mBundle = (ord.produk || '').match(/Bundle ([^-]+)/i);
      const bundle = mBundle ? mBundle[1].trim() : '';
      const isPlate = baseProduct.includes('Plate');

      if (isPlate) {
        let remaining = actualQty;
        while (remaining > 0) {
          const isDouble = remaining >= 2;
          const lineQty = isDouble ? 2 : 1;
          const lbl = isDouble ? 'Double (2 pcs)' : 'Single (1 pcs)';
          
          let linePrice = 0;
          if (conf.priceOverride !== undefined && conf.priceOverride !== null) {
            linePrice = conf.priceOverride;
          } else {
            linePrice = lookupPrice(customerType, conf.vehicleType, isDouble ? 'Double' : 'Single', bundle);
          }
          
          const validNomor = ord.nomor_pesanan && ord.nomor_pesanan !== 'undefined';
          let c1 = validNomor ? `[${ord.nomor_pesanan}] Plate - ${lbl}` : `Plate - ${lbl}`;
          if (bundle) c1 += ` + Bundle ${bundle}`;
          
          let fontNotes = '';
          if (ord.warna_plat) fontNotes += `Warna Plat: ${ord.warna_plat} `;
          if (ord.jenis_font) fontNotes += `Font: ${ord.jenis_font} `;
          if (ord.notes) fontNotes += `Notes: ${ord.notes}`;
          
          let c2 = `${conf.vehicleType} • ${ord.nomor_plat || '-'} • ${ord.bulan_tahun || '-'}`;
          if (fontNotes) c2 += ` • ${fontNotes}`;

          rows.push({ col1: sanitize(c1), col2: sanitize(c2), price: linePrice, qtyDisplay: '1', subtotal: linePrice });
          remaining -= lineQty;
        }
      } else {
        let basePrice = 0;
        if (conf.priceOverride !== undefined && conf.priceOverride !== null) {
          basePrice = conf.priceOverride;
        } else {
          basePrice = lookupPrice(customerType, '', '', '') || PRICES.retail[baseProduct] || 0;
        }
        
        const validNomor = ord.nomor_pesanan && ord.nomor_pesanan !== 'undefined';
        let c1 = validNomor ? `[${ord.nomor_pesanan}] ${baseProduct}` : baseProduct;
        if (bundle) c1 += ` + Bundle ${bundle}`;
        rows.push({ col1: sanitize(c1), col2: sanitize(ord.notes || ''), price: basePrice, qtyDisplay: String(actualQty), subtotal: basePrice * actualQty });
      }
    }

    for (const ex of extras) {
      const exPrice = parseFloat(ex.price) || 0;
      const exQty   = parseInt(ex.qty) || 1;
      rows.push({ col1: sanitize(ex.product), col2: '', price: exPrice, qtyDisplay: String(exQty), subtotal: exPrice * exQty });
    }

    const shippingAmt = parseFloat(shippingTotal) || 0;
    const grandTotal  = rows.reduce((s, r) => s + r.subtotal, 0) + shippingAmt;

    // ── 5. Draw Table Header ─────────────────────────────────
    let curY = 595;
    rect(TABLE_X, curY, TABLE_W, 22, BLUE, page);
    const headerNoW = bold.widthOfTextAtSize('No', 9);
    txt('No', TABLE_X + ((C.item - TABLE_X) / 2) - (headerNoW / 2), curY + 7, 9, bold, WHITE, page);
    txt('Item', C.item + 5, curY + 7, 9, bold, WHITE, page);
    txt('Price', C.price + 5, curY + 7, 9, bold, WHITE, page);
    txt('Qty', C.qty + 5, curY + 7, 9, bold, WHITE, page);
    txt('Subtotal', C.subtotal + 5, curY + 7, 9, bold, WHITE, page);

    // ── 6. Draw data rows ────────────────────────────────────
    const FS  = 10;   // Increased to 10 for better readability based on user's 11pt request
    const FS2 = 9;
    const PAD = 6;
    const ROW_H = 34;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const itemW    = C.price - C.item - PAD * 2;
      const wrapped1 = wrapText(row.col1, itemW, reg, FS);
      const wrapped2 = row.col2 ? wrapText(row.col2, itemW, reg, FS2) : [];
      const dynH     = Math.max(ROW_H, (wrapped1.length + wrapped2.length) * (FS * 1.4) + PAD * 2 + 4);

      // Pagination
      if (curY - dynH < 50) {
        // Close table on current page
        line(TABLE_X, curY, TABLE_R, curY);
        [TABLE_X, C.item, C.price, C.qty, C.subtotal, TABLE_R].forEach(x => line(x, curY, x, TABLE_DATA_TOP, GRAY, 0.5, page));
        
        page = pdfDoc.addPage([596, 842]);
        curY = 750;
        // Redraw table header
        rect(TABLE_X, curY, TABLE_W, 22, BLUE, page);
        const headerNoW2 = bold.widthOfTextAtSize('No', 9);
        txt('No', TABLE_X + ((C.item - TABLE_X) / 2) - (headerNoW2 / 2), curY + 7, 9, bold, WHITE, page);
        txt('Item', C.item + 5, curY + 7, 9, bold, WHITE, page);
        txt('Price', C.price + 5, curY + 7, 9, bold, WHITE, page);
        txt('Qty', C.qty + 5, curY + 7, 9, bold, WHITE, page);
        txt('Subtotal', C.subtotal + 5, curY + 7, 9, bold, WHITE, page);
      }

      if (i % 2 === 1) rect(TABLE_X, curY - dynH, TABLE_W, dynH, rgb(0.925, 0.945, 0.975), page);

      line(TABLE_X, curY - dynH, TABLE_R, curY - dynH, GRAY, 0.5, page);
      [TABLE_X, C.item, C.price, C.qty, C.subtotal, TABLE_R].forEach(x => line(x, curY, x, curY - dynH, GRAY, 0.5, page));

      // Draw text content
      const rowNumStr = String(i + 1);
      const rowNumW = reg.widthOfTextAtSize(rowNumStr, FS);
      txt(rowNumStr, TABLE_X + ((C.item - TABLE_X) / 2) - (rowNumW / 2), curY - PAD - FS, FS, reg, DARK, page);

      let lineY = curY - PAD - FS;
      for (const ln of wrapped1) { txt(ln, C.item + PAD, lineY, FS, reg, DARK, page); lineY -= FS * 1.4; }
      for (const ln of wrapped2) { txt(ln, C.item + PAD, lineY, FS2, reg, GRAY, page); lineY -= FS2 * 1.4; }

      rtxt(rpFmt(row.price), C.price + (C.qty - C.price) - PAD, curY - PAD - FS, FS, reg, DARK, page);
      const qtyW = reg.widthOfTextAtSize(row.qtyDisplay, FS);
      txt(row.qtyDisplay, C.qty + 30 - (qtyW / 2), curY - PAD - FS, FS, reg, DARK, page);
      rtxt(rpFmt(row.subtotal), TABLE_R - PAD, curY - PAD - FS, FS, reg, DARK, page);

      curY -= dynH;
    }

    // Outer table border for current page
    line(TABLE_X, curY, TABLE_R, curY, GRAY, 0.5, page);

    // ── 6. Shipping & Grand Total ────────────────────────────
    if (curY - (FOOT_H * 2) < 50) {
      page = pdfDoc.addPage([596, 842]);
      curY = 750;
    }

    rect(TABLE_X, curY - FOOT_H, TABLE_W, FOOT_H, BLUE, page);
    line(TABLE_X, curY - FOOT_H, TABLE_R, curY - FOOT_H, GRAY, 0.5, page);
    [TABLE_X, TABLE_R].forEach(x => line(x, curY, x, curY - FOOT_H, GRAY, 0.5, page));

    const sanitizedShip = sanitize(shippingService);
    const shipLabel = sanitizedShip ? `Shipping - ${sanitizedShip}` : 'Shipping';
    rtxt(shipLabel, C.subtotal - PAD, curY - FOOT_H + 6, FS, bold, WHITE, page);
    rtxt(rpFmt(shippingAmt), TABLE_R - PAD * 2, curY - FOOT_H + 6, FS, bold, WHITE, page);
    curY -= FOOT_H;

    rect(TABLE_X, curY - FOOT_H, TABLE_W, FOOT_H, BLUE, page);
    line(TABLE_X, curY - FOOT_H, TABLE_R, curY - FOOT_H, GRAY, 0.5, page);
    [TABLE_X, TABLE_R].forEach(x => line(x, curY, x, curY - FOOT_H, GRAY, 0.5, page));

    rtxt('Grand Total', C.subtotal - PAD, curY - FOOT_H + 6, FS + 1, bold, WHITE, page);
    rtxt(rpFmt(grandTotal), TABLE_R - PAD * 2, curY - FOOT_H + 6, FS + 1, bold, WHITE, page);
    curY -= FOOT_H;

    // ── 7. Payment Info ──────────────────────────────────────
    if (curY - 140 < 50) {
      page = pdfDoc.addPage([596, 842]);
      curY = 750;
    }

    curY -= 60;
    txt('Payment Info :', C.no, curY, 21, bold, DARK, page);
    txt('BCA 7615417378 a.n. Matthew Utama', C.no, curY - 26, 21, bold, DARK, page);

    // ── 8. Terms and Condition ───────────────────────────────
    curY -= 65;
    txt('Terms and Condition', C.no, curY, 11, bold, DARK, page);

    const termsText = [
      'Preview design akan dikirim setelah payment. Proses editing berjalan ± 2 hari, dan produksi',
      'berjalan ± 4 hari kerja. Durasi diatas merupakan estimasi dan akan menyesuaikan dengan antrian pesanan.',
      '',
      'Apabila ada kesalahan pada draft design dapat mengambil revisi sebanyak 1x.',
      'Harap untuk menjabarkan revisi yang mau dilakukan dengan detail dan jelas. Revisi berikutnya',
      'akan dikenakan biaya 25rb.',
      '',
      'Strapped tidak bertanggung jawab atas segala hal yang terjadi atas penggunaan pada jalan raya',
      'umum dan permasalahan dengan aparat lalu lintas hingga terjadinya pemberian surat tilang.'
    ];

    let tY = curY - 18;
    for (const termLine of termsText) {
      txt(termLine, C.no, tY, 9.5, reg, DARK, page);
      tY -= 14;
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
