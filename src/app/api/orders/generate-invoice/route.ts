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
const TABLE_X = 28;
const TABLE_R = 568;
const TABLE_W = TABLE_R - TABLE_X;
const C = { no: 40, item: 60, price: 325, qty: 420, subtotal: 480, right: 556 };

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

function rpFmt(n: any) { 
  const num = parseFloat(String(n).replace(/[^0-9.-]+/g,"")) || 0;
  return 'Rp ' + num.toLocaleString('id-ID'); 
}

function sanitize(s: any) {
  return String(s || '')
    .replace(/[\u2011-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\r/g, '');
}

function wrapText(text: string, maxW: number, font: PDFFont, size: number): string[] {
  const s = sanitize(text); if (!s) return [];
  const lines: string[] = [];
  const explicitLines = s.split('\n');
  
  for (const expLine of explicitLines) {
    const words = expLine.split(' ');
    let cur = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      if (font.widthOfTextAtSize(cur + ' ' + w, size) <= maxW) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
  }
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
    bundleOverride?: string;
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
      const conf = perOrder[ord.id] || { productType: 'Plate', vehicleType: 'Mobil', bundle: '' };
      const baseProduct = String(conf.productType || 'Plate');
      const designMatch = String(ord.produk || '').split('(')[0].trim();
      const baseName = designMatch || baseProduct;
      
      const rawQty = ord.qty || '1';
      const actualQty = parseInt(String(rawQty)) || 1;
      let qtyString = rawQty;

      let bundleKey = '';
      let bundleDisplay = '';
      if (conf.bundleOverride && conf.bundleOverride !== 'Tidak ada bundle' && conf.bundleOverride !== 'Non-Bundle') {
        bundleKey = conf.bundleOverride;
        bundleDisplay = conf.bundleOverride.replace('Bundle ', '');
      } else {
        const mBundle = String(ord.produk || '').match(/Bundle ([^-]+)/i);
        if (mBundle) {
          bundleDisplay = mBundle[1].trim();
          bundleKey = 'Bundle ' + bundleDisplay;
        }
      }

      const isPlate = baseProduct.includes('Plate');

      if (isPlate) {
        let remaining = actualQty;
        while (remaining > 0) {
          const isDouble = remaining >= 2;
          const lineQty = isDouble ? 2 : 1;
          
          let linePrice = 0;
          if (conf.priceOverride !== undefined && conf.priceOverride !== null && String(conf.priceOverride).trim() !== '') {
            linePrice = Number(conf.priceOverride);
          } else {
            linePrice = lookupPrice(customerType, conf.vehicleType, isDouble ? 'Double' : 'Single', bundleKey);
            if (!linePrice) linePrice = PRICES.retail[baseProduct] || 0;
          }
          
          const validNomor = ord.nomor_pesanan && ord.nomor_pesanan !== 'undefined';
          let titleText = baseProduct;
          if (baseName && baseName.toLowerCase() !== baseProduct.toLowerCase()) {
            titleText = `${baseProduct} - ${baseName}`;
          }
          let c1 = validNomor ? `[${ord.nomor_pesanan}] ${titleText}` : titleText;
          if (bundleDisplay) c1 += ` + Bundle ${bundleDisplay}`;
          if (ord.nomor_plat && ord.nomor_plat !== '-') c1 += ` (${ord.nomor_plat})`;
          
          let c2 = ord.form_detail || '';

          rows.push({ col1: sanitize(c1), col2: sanitize(c2), price: linePrice, qtyDisplay: '1', subtotal: linePrice });
          remaining -= lineQty;
        }
      } else {
        let basePrice = 0;
        if (conf.priceOverride !== undefined && conf.priceOverride !== null && String(conf.priceOverride).trim() !== '') {
          basePrice = Number(conf.priceOverride);
        } else {
          basePrice = lookupPrice(customerType, '', '', '') || PRICES.retail[baseProduct] || 0;
        }
        
        const validNomor = ord.nomor_pesanan && ord.nomor_pesanan !== 'undefined';
        let titleText = baseProduct;
        if (baseName && baseName.toLowerCase() !== baseProduct.toLowerCase()) {
          titleText = `${baseProduct} - ${baseName}`;
        }
        let c1 = validNomor ? `[${ord.nomor_pesanan}] ${titleText}` : titleText;
        if (bundleDisplay) c1 += ` + Bundle ${bundleDisplay}`;
        if (ord.nomor_plat && ord.nomor_plat !== '-') c1 += ` (${ord.nomor_plat})`;

        let c2 = ord.form_detail || '';

        const qtyDisplay = ['Triple', 'Quadruple'].includes(qtyString) ? qtyString : String(actualQty);
        rows.push({ col1: sanitize(c1), col2: sanitize(c2), price: basePrice, qtyDisplay: sanitize(qtyDisplay), subtotal: basePrice * actualQty });
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
    
    const hy = curY + 7;
    const centerT = (t: string, x1: number, x2: number, yPos: number = hy) => {
      const w = bold.widthOfTextAtSize(t, 9);
      txt(t, x1 + (x2 - x1) / 2 - w / 2, yPos, 9, bold, WHITE, page);
    };

    centerT('No', TABLE_X, C.item);
    centerT('Item', C.item, C.price);
    centerT('Price', C.price, C.qty);
    centerT('Qty', C.qty, C.subtotal);
    centerT('Subtotal', C.subtotal, TABLE_R);

    // ── 6. Draw data rows ────────────────────────────────────
    const FS  = 10;
    const FS2 = 9;
    const PAD = 6;
    const ROW_H = 34;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const wrapped1Corrected = wrapText(row.col1, C.price - C.item - PAD * 2, bold, FS);
      const wrapped2 = wrapText(row.col2 || '', C.price - C.item - PAD * 2, reg, FS2);
      const textLines1 = wrapped1Corrected.length;
      const textLines2 = wrapped2.length;
      const totalTextH = (textLines1 * FS * 1.4) + (textLines2 > 0 ? (textLines2 * FS2 * 1.4) + 4 : 0);
      
      const dynH = Math.max(ROW_H, totalTextH + PAD * 2);

      if (curY - dynH < FOOT_H + 50) {
        page = pdfDoc.addPage([596, 842]);
        curY = 750;
        rect(TABLE_X, curY, TABLE_W, 22, BLUE, page);
        centerT('No', TABLE_X, C.item, curY + 7);
        centerT('Item', C.item, C.price, curY + 7);
        centerT('Price', C.price, C.qty, curY + 7);
        centerT('Qty', C.qty, C.subtotal, curY + 7);
        centerT('Subtotal', C.subtotal, TABLE_R, curY + 7);
      }

      if (i % 2 === 1) rect(TABLE_X, curY - dynH, TABLE_W, dynH, rgb(0.925, 0.945, 0.975), page);

      const rowCenterY = curY - (dynH / 2);

      const rowNumStr = String(i + 1);
      const rowNumW = reg.widthOfTextAtSize(rowNumStr, FS);
      txt(rowNumStr, TABLE_X + ((C.item - TABLE_X) / 2) - (rowNumW / 2), rowCenterY - (FS/2) + 2, FS, reg, DARK, page);

      let lineY = rowCenterY + (totalTextH / 2) - FS + 2;
      for (const ln of wrapped1Corrected) { txt(ln, C.item + PAD, lineY, FS, bold, BLUE, page); lineY -= FS * 1.4; }
      if (textLines2 > 0) lineY -= 4;
      for (const ln of wrapped2) { txt(ln, C.item + PAD, lineY, FS2, reg, GRAY, page); lineY -= FS2 * 1.4; }

      rtxt(rpFmt(row.price), C.price + (C.qty - C.price) - PAD, rowCenterY - (FS/2) + 2, FS, reg, DARK, page);
      const qtyW = reg.widthOfTextAtSize(row.qtyDisplay, FS);
      txt(row.qtyDisplay, C.qty + 30 - (qtyW / 2), rowCenterY - (FS/2) + 2, FS, reg, DARK, page);
      rtxt(rpFmt(row.subtotal), TABLE_R - PAD, rowCenterY - (FS/2) + 2, FS, reg, DARK, page);

      curY -= dynH;
    }

    // ── 6. Shipping & Grand Total ────────────────────────────
    if (curY - (FOOT_H * 2) < 50) {
      page = pdfDoc.addPage([596, 842]);
      curY = 750;
    }

    rect(TABLE_X, curY - FOOT_H, TABLE_W, FOOT_H, BLUE, page);

    const sanitizedShip = sanitize(shippingService);
    const shipLabel = sanitizedShip ? `Shipping - ${sanitizedShip}` : 'Shipping';
    rtxt(shipLabel, C.subtotal - PAD, curY - FOOT_H + 6, FS, bold, WHITE, page);
    rtxt(rpFmt(shippingAmt), TABLE_R - PAD * 2, curY - FOOT_H + 6, FS, bold, WHITE, page);
    curY -= FOOT_H;

    rect(TABLE_X, curY - FOOT_H, TABLE_W, FOOT_H, BLUE, page);

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

    const firstOrderData = orders[0] || {};
    const namaExport = sanitize(firstOrderData.nama_penerima || firstOrderData.nama || 'Customer');
    
    let designExport = firstOrderData.nomor_plat ? sanitize(String(firstOrderData.nomor_plat)) : '';
    if (!designExport && firstOrderData.produk) {
      designExport = sanitize(String(firstOrderData.produk).split('(')[0].trim());
    }

    const exportFilename = `Strapped ${invoiceNo} - ${namaExport} ${designExport}.pdf`.replace(/\s+/g, ' ');
    const safeFilename = exportFilename.replace(/[^\x20-\x7E]/g, '');

    pdfDoc.setTitle(safeFilename.replace('.pdf', ''));
    pdfDoc.setAuthor('Strapped');
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"`
      }
    });

  } catch (error: any) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json({ error: `Failed to generate PDF: ${error.message}`, stack: error.stack }, { status: 500 });
  }
}
