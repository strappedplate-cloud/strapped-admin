import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/data';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Order } from '@/lib/types';

function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x00-\x7F]/g, '');
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return ['-'];
  const sanitized = sanitizeText(text);
  const words = sanitized.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(currentLine + ' ' + word, fontSize);
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Build the header line for a merged group of orders.
 * Format: "Plate1, Plate2; QtySize1 - Ukuran1, QtyKeychain; Qty Non-Bundle"
 * Matches the example: "Carbonized, Carbonized, Raveil, Raveil; 2 Mobil - Indo, 2 Keychain; 4 Non-Bundle"
 */
function buildMergedHeader(orders: Order[]): string {
  // 1. Plate numbers joined by ", "
  const plates = orders.map(o => o.nomor_plat || 'NO DESIGN').join(', ');

  // 2. Count sizes
  const sizeCounts: Record<string, number> = {};
  orders.forEach(o => {
    const size = o.ukuran_plat || 'Unknown';
    sizeCounts[size] = (sizeCounts[size] || 0) + 1;
  });
  const sizeStr = Object.entries(sizeCounts)
    .map(([size, count]) => `${count} ${size}`)
    .join(', ');

  // 3. Count bundles (non-bundle = jenis_bundling is empty / "Non-Bundle")
  const nonBundleCount = orders.filter(o => !o.jenis_bundling || o.jenis_bundling === 'Non-Bundle').length;
  const bundleParts: string[] = [];
  if (nonBundleCount > 0) bundleParts.push(`${nonBundleCount} Non-Bundle`);

  // Build final string
  const parts = [plates, sizeStr];
  if (bundleParts.length > 0) parts.push(bundleParts.join(', '));
  return parts.join('; ');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderIds } = body as { orderIds: string[] };

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ error: 'No order IDs provided' }, { status: 400 });
    }

    const allOrders = await getOrders();
    const selectedOrders = allOrders.filter(o => orderIds.includes(o.id));

    if (selectedOrders.length === 0) {
      return NextResponse.json({ error: 'No matching orders found' }, { status: 404 });
    }

    // Group orders by customer (nama_penerima + no_hp as key, fallback to nama + no_hp)
    const groups: Map<string, Order[]> = new Map();
    for (const order of selectedOrders) {
      const receiver = order.nama_penerima || order.nama || 'Unknown';
      const phone = order.no_hp || '';
      const key = `${receiver}__${phone}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(order);
    }

    // Build entries: merged groups + individual orders without merge
    // Each "entry" represents one label cell in the PDF
    const entries: Order[][] = Array.from(groups.values());

    // PDF setup
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 20;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const colWidth = (pageWidth - 2 * margin) / 2;
    const fontSize = 8;
    const lineHeight = fontSize * 1.2;
    const padding = 8;
    const contentWidth = colWidth - 2 * padding;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentTop = margin;

    const calcGroupHeight = (group: Order[]) => {
      let h = 0;
      const headerText = buildMergedHeader(group);
      const headerLines = wrapText(headerText, contentWidth, fontBold, fontSize);
      h += headerLines.length * lineHeight + 4;

      h += lineHeight + 8; // sender

      const receiver = group[0].nama_penerima || group[0].nama || '—';
      const phone = group[0].no_hp || '—';
      const receiverText = `Penerima : ${receiver} (${phone})`;
      const receiverLines = wrapText(receiverText, contentWidth, fontBold, fontSize);
      h += receiverLines.length * lineHeight + 4;

      const addrLines = wrapText(group[0].alamat_pengiriman || '—', contentWidth, fontRegular, fontSize);
      h += addrLines.length * lineHeight;

      return h + 2 * padding;
    };

    const drawGroup = (
      group: Order[],
      x: number,
      startTop: number,
      rowHeight: number
    ) => {
      // Draw border
      page.drawRectangle({
        x,
        y: pageHeight - startTop - rowHeight,
        width: colWidth,
        height: rowHeight,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 0.5,
      });

      let textTop = startTop + padding;
      const textX = x + padding;

      // Header (plates + sizes + bundle)
      const headerText = buildMergedHeader(group);
      for (const line of wrapText(headerText, contentWidth, fontBold, fontSize)) {
        page.drawText(line, { x: textX, y: pageHeight - textTop - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
      textTop += 4;

      // Sender
      page.drawText('Pengirim : STRAPPED (0895-7001-57777)', {
        x: textX,
        y: pageHeight - textTop - fontSize,
        size: fontSize,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      textTop += lineHeight + 8;

      // Receiver
      const receiver = group[0].nama_penerima || group[0].nama || '—';
      const phone = group[0].no_hp || '—';
      const receiverText = `Penerima : ${receiver} (${phone})`;
      for (const line of wrapText(receiverText, contentWidth, fontBold, fontSize)) {
        page.drawText(line, { x: textX, y: pageHeight - textTop - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
      textTop += 4;

      // Address
      for (const line of wrapText(group[0].alamat_pengiriman || '—', contentWidth, fontRegular, fontSize)) {
        page.drawText(line, { x: textX, y: pageHeight - textTop - fontSize, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
    };

    for (let i = 0; i < entries.length; i += 2) {
      const group1 = entries[i];
      const group2 = entries[i + 1];

      const height1 = calcGroupHeight(group1);
      const height2 = group2 ? calcGroupHeight(group2) : 0;
      const rowHeight = Math.max(height1, height2, 60);

      if (currentTop + rowHeight > pageHeight - margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        currentTop = margin;
      }

      drawGroup(group1, margin, currentTop, rowHeight);
      if (group2) {
        drawGroup(group2, margin + colWidth, currentTop, rowHeight);
      }

      currentTop += rowHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const date = new Date().toISOString().split('T')[0];
    const filename = `strapped-merged-shipping-${date}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Merge PDF Error:', err);
    return NextResponse.json({ error: 'Failed to generate merged PDF: ' + err.message }, { status: 500 });
  }
}
