import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { Order } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// ─── Colours ──────────────────────────────────────────────────
const BLUE  = rgb(0.106, 0.263, 0.545);   // matches template header blue
const WHITE = rgb(1, 1, 1);
const DARK  = rgb(0.13, 0.13, 0.13);
const GRAY  = rgb(0.45, 0.45, 0.45);

// ─── Template coordinates (from grid calibration, page 596×842) ──
// Column x-edges
const C = { no: 50, item: 80, price: 380, qty: 460, subtotal: 510, right: 550 };
// Row heights
const ROW_H  = 36;
const FOOT_H = 20;
// Table header bottom y (data rows start here going down)
const TABLE_DATA_TOP = 562;
// Available space before payment info
const PAYMENT_INFO_Y = 412;
const PAYMENT_BCA_Y  = 365;

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
    const test = cur + ' ' + words[i];
    if (font.widthOfTextAtSize(test, size) <= maxW) cur = test;
    else { lines.push(cur); cur = words[i]; }
  }
  lines.push(cur); return lines;
}

// ─── Payload types ────────────────────────────────────────────
interface ExtraProduct { product: string; price: string; qty: string; }
interface OrderLineData { vehicleType: 'Mobil' | 'Motor'; bundleOverride: string; }
interface InvoicePayload {
  orders: Order[];
  customerType: 'retail' | 'reseller';
  bengkelName: string;
  perOrder: Record<string, OrderLineData>;
  extras: ExtraProduct[];
  shippingService: string;
  shippingTotal: string;
  invoiceNo: string;
}

// ─── Main handler ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: InvoicePayload = await req.json();
    const { orders, customerType, bengkelName, perOrder, extras, shippingService, shippingTotal, invoiceNo } = body;
    if (!orders?.length) return NextResponse.json({ error: 'No orders' }, { status: 400 });

    // Load template
    const templatePath = path.join(process.cwd(), 'public', 'invoice-template.pdf');
    const templateBytes = fs.readFileSync(templatePath);
    const templatePdf   = await PDFDocument.load(templateBytes);

    const pdfDoc = await PDFDocument.create();
    const [tplPage] = await pdfDoc.copyPages(templatePdf, [0]);
    pdfDoc.addPage(tplPage);
    const page = pdfDoc.getPage(0);

    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const reg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ── Helper draws ────────────────────────────────────────
    const txt  = (s: string, x: number, y: number, sz: number, f: PDFFont, col = DARK) =>
      page.drawText(sanitize(s), { x, y, size: sz, font: f, color: col });
    const rtxt = (s: string, rightX: number, y: number, sz: number, f: PDFFont, col = DARK) =>
      page.drawText(sanitize(s), { x: rightX - f.widthOfTextAtSize(sanitize(s), sz), y, size: sz, font: f, color: col });
    const rect = (x: number, y: number, w: number, h: number, col: ReturnType<typeof rgb>) =>
      page.drawRectangle({ x, y, width: w, height: h, color: col });
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.4, color: rgb(0.8, 0.8, 0.8) });

    const PAGE_W = 596;
    const TABLE_W = C.right - C.no; // 500

    // ── 1. White-out header placeholders, write real values ──
    // [Date] and [Invoice_No] are in the blue header — cover with blue, write white
    const firstOrder = orders[0];
    const invoiceDate = firstOrder.tanggal_pembelian
      ? new Date(firstOrder.tanggal_pembelian).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    rect(350, 718, 200, 18, BLUE); // cover [Date] area
    rtxt(invoiceDate, C.right, 723, 8.5, reg, WHITE);

    rect(350, 703, 200, 16, BLUE); // cover [Invoice_No] area
    rtxt(invoiceNo, C.right, 708, 8.5, reg, WHITE);

    // ── 2. White-out & fill recipient info ───────────────────
    rect(C.no, 628, TABLE_W, 30, WHITE); // cover [Name]-[No_HP]
    const recipientName  = sanitize(firstOrder.nama_penerima || firstOrder.nama);
    const recipientPhone = sanitize(firstOrder.no_hp || '');
    txt(`${recipientName} - ${recipientPhone}`, C.no, 633, 13, bold, DARK);

    rect(C.no, 613, TABLE_W, 16, WHITE); // cover [Bengkel]
    if (customerType === 'reseller' && bengkelName) {
      txt(sanitize(bengkelName), C.no, 616, 9, reg, GRAY);
    }

    // ── 3. Build row data ────────────────────────────────────
    interface RowData { col1: string; col2: string; price: number; qtyLabel: string; subtotal: number; }
    const rows: RowData[] = [];

    for (const order of orders) {
      const ld = perOrder[order.id] ?? { vehicleType: 'Mobil', bundleOverride: '' };
      const qtyLabel = (order.qty ?? 1) >= 2 ? 'Double' : 'Single';
      const bundle   = ld.bundleOverride || '';
      const price    = lookupPrice(customerType, ld.vehicleType, qtyLabel, bundle);
      const col1     = `Plate - ${qtyLabel}${bundle ? ' ' + bundle : ''} (${ld.vehicleType})`;
      const col2     = sanitize(order.nomor_plat || '') + (order.ukuran_plat ? ' · ' + sanitize(order.ukuran_plat) : '');
      rows.push({ col1, col2, price, qtyLabel, subtotal: price });
    }

    for (const ex of extras) {
      const exPrice = parseFloat(ex.price) || 0;
      const exQty   = parseInt(ex.qty) || 1;
      rows.push({ col1: sanitize(ex.product), col2: '', price: exPrice, qtyLabel: String(exQty), subtotal: exPrice * exQty });
    }

    const shippingAmt = parseFloat(shippingTotal) || 0;
    const grandTotal  = rows.reduce((s, r) => s + r.subtotal, 0) + shippingAmt;

    // ── 4. White-out template sample rows + shipping + grandtotal ──
    // Wipe entire area from bottom of table header down to above Payment Info
    const WIPE_TOP = TABLE_DATA_TOP;
    const WIPE_BOT = PAYMENT_INFO_Y - 2;
    rect(C.no - 1, WIPE_BOT, TABLE_W + 2, WIPE_TOP - WIPE_BOT, WHITE);

    // ── 5. Draw data rows ────────────────────────────────────
    const FS  = 8.5;   // font size
    const FS2 = 7.5;   // secondary line font size
    const PAD = 5;     // horizontal padding inside cell

    let curY = TABLE_DATA_TOP; // top of current row

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Dynamic height based on text wrapping
      const itemW    = C.price - C.item - PAD * 2;
      const wrapped1 = wrapText(row.col1, itemW, reg, FS);
      const wrapped2 = row.col2 ? wrapText(row.col2, itemW, reg, FS2) : [];
      const dynH     = Math.max(ROW_H, (wrapped1.length + wrapped2.length) * (FS * 1.4) + PAD * 2 + 6);

      // Stop if we'd overlap payment info
      if (curY - dynH < WIPE_BOT) break;

      // Alt row background
      if (i % 2 === 1) {
        rect(C.no, curY - dynH, TABLE_W, dynH, rgb(0.925, 0.945, 0.975));
      }

      // Cell borders (bottom line)
      line(C.no, curY - dynH, C.right, curY - dynH);
      // Vertical separators
      [C.item, C.price, C.qty, C.subtotal, C.right].forEach(x =>
        line(x, curY, x, curY - dynH)
      );

      // Row number
      txt(String(i + 1), C.no + PAD, curY - PAD - FS, FS, reg, DARK);

      // Item lines
      let lineY = curY - PAD - FS;
      for (const ln of wrapped1) { txt(ln, C.item + PAD, lineY, FS, reg, DARK); lineY -= FS * 1.4; }
      for (const ln of wrapped2) { txt(ln, C.item + PAD, lineY, FS2, reg, GRAY); lineY -= FS2 * 1.4; }

      // Price (right-aligned)
      rtxt(rpFmt(row.price), C.price + (C.qty - C.price) - PAD, curY - PAD - FS, FS, reg, DARK);

      // Qty
      const qtyDisp = (row.qtyLabel === 'Single' || row.qtyLabel === 'Double') ? '1' : row.qtyLabel;
      txt(qtyDisp, C.qty + PAD, curY - PAD - FS, FS, reg, DARK);

      // Subtotal (right-aligned)
      rtxt(rpFmt(row.subtotal), C.right - PAD, curY - PAD - FS, FS, reg, DARK);

      curY -= dynH;
    }

    // Outer left/right/top borders of data area
    line(C.no, TABLE_DATA_TOP, C.no, curY);
    line(C.right, TABLE_DATA_TOP, C.right, curY);

    // ── 6. Shipping row (blue bg, white text) ────────────────
    const SHIP_Y = curY;
    rect(C.no, SHIP_Y - FOOT_H, TABLE_W, FOOT_H, BLUE);
    const shipLabel = `Shipping - ${sanitize(shippingService || '-')}`;
    txt(shipLabel, C.price - reg.widthOfTextAtSize(shipLabel, FS) - PAD * 2, SHIP_Y - FOOT_H + 6, FS, reg, WHITE);
    rtxt(rpFmt(shippingAmt), C.right - PAD, SHIP_Y - FOOT_H + 6, FS, reg, WHITE);
    curY -= FOOT_H;

    // ── 7. Grand Total row ───────────────────────────────────
    rect(C.no, curY - FOOT_H, TABLE_W, FOOT_H, BLUE);
    txt('Grand Total', C.subtotal - 10, curY - FOOT_H + 6, FS, bold, WHITE);
    rtxt(rpFmt(grandTotal), C.right - PAD, curY - FOOT_H + 6, FS, bold, WHITE);

    // ── 8. Outer table border (full table incl header) ───────
    page.drawRectangle({
      x: C.no, y: curY - FOOT_H,
      width: TABLE_W, height: TABLE_DATA_TOP + 28 - (curY - FOOT_H),
      borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5,
    });

    // Finalize
    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoiceNo}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error('Invoice error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
