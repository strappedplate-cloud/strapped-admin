import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/data';
import { Order } from '@/lib/types';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\r\n]+/g, ' ')          // convert newlines to spaces
    .replace(/[\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, '');     // strip all remaining non-printable / non-ASCII
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return ['-'];
  const sanitized = sanitizeText(text);
  // Pre-split on any remaining whitespace-only lines or explicit newlines in source
  const segments = sanitized.split(/\n+/);
  const lines: string[] = [];
  for (const segment of segments) {
    const words = segment.trim().split(' ').filter(Boolean);
    if (words.length === 0) continue;
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      if (font.widthOfTextAtSize(testLine, fontSize) < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : ['-'];
}

/** Group orders by same customer: nama + no_hp + alamat_pengiriman */
function groupOrders(orders: Order[]): Order[][] {
  const map = new Map<string, Order[]>();
  for (const o of orders) {
    const key = `${(o.nama || '').trim()}__${(o.no_hp || '').trim()}__${(o.alamat_pengiriman || '').trim()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return Array.from(map.values());
}

/** Build header line for a group of orders */
function buildHeader(group: Order[]): string {
  // Plate numbers
  const plates = group.map(o => o.nomor_plat || 'NO DESIGN').join(', ');

  // Size counts
  const sizeCounts: Record<string, number> = {};
  group.forEach(o => {
    const s = o.ukuran_plat || 'Unknown';
    sizeCounts[s] = (sizeCounts[s] || 0) + 1;
  });
  const sizeStr = Object.entries(sizeCounts).map(([s, c]) => `${c} ${s}`).join(', ');

  // Non-bundle count
  const nonBundleCount = group.filter(o => !o.jenis_bundling || o.jenis_bundling === 'Non-Bundle').length;
  const parts = [plates, sizeStr];
  if (nonBundleCount > 0) parts.push(`${nonBundleCount} Non-Bundle`);

  return parts.join('; ');
}

export async function GET(req: NextRequest) {
  try {
    const orders = await getOrders();
    const production = orders
      .filter(o => o.status === 'production_done')
      .sort((a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime());

    if (production.length === 0) {
      return NextResponse.json({ error: 'No orders in production_done stage' }, { status: 404 });
    }

    const groups = groupOrders(production);

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

    const calcHeight = (group: Order[]) => {
      let h = 0;
      h += wrapText(buildHeader(group), contentWidth, fontBold, fontSize).length * lineHeight + 4;
      h += lineHeight + 8; // sender
      const receiver = `Penerima : ${group[0].nama_penerima || group[0].nama || '-'} (${group[0].no_hp || '-'})`;
      h += wrapText(receiver, contentWidth, fontBold, fontSize).length * lineHeight + 4;
      h += wrapText(group[0].alamat_pengiriman || '-', contentWidth, fontRegular, fontSize).length * lineHeight;
      return h + 2 * padding;
    };

    const drawGroup = (group: Order[], x: number, startTop: number, rowHeight: number) => {
      page.drawRectangle({
        x, y: pageHeight - startTop - rowHeight,
        width: colWidth, height: rowHeight,
        borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5,
      });

      let textTop = startTop + padding;
      const textX = x + padding;

      for (const line of wrapText(buildHeader(group), contentWidth, fontBold, fontSize)) {
        page.drawText(line, { x: textX, y: pageHeight - textTop - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
      textTop += 4;

      page.drawText('Pengirim : STRAPPED (0895-7001-57777)', {
        x: textX, y: pageHeight - textTop - fontSize, size: fontSize, font: fontRegular, color: rgb(0, 0, 0),
      });
      textTop += lineHeight + 8;

      const receiverText = `Penerima : ${group[0].nama_penerima || group[0].nama || '-'} (${group[0].no_hp || '-'})`;
      for (const line of wrapText(receiverText, contentWidth, fontBold, fontSize)) {
        page.drawText(line, { x: textX, y: pageHeight - textTop - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
      textTop += 4;

      for (const line of wrapText(group[0].alamat_pengiriman || '-', contentWidth, fontRegular, fontSize)) {
        page.drawText(line, { x: textX, y: pageHeight - textTop - fontSize, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
    };

    for (let i = 0; i < groups.length; i += 2) {
      const g1 = groups[i];
      const g2 = groups[i + 1];
      const h1 = calcHeight(g1);
      const h2 = g2 ? calcHeight(g2) : 0;
      const rowHeight = Math.max(h1, h2, 60);

      if (currentTop + rowHeight > pageHeight - margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        currentTop = margin;
      }

      drawGroup(g1, margin, currentTop, rowHeight);
      if (g2) drawGroup(g2, margin + colWidth, currentTop, rowHeight);
      currentTop += rowHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const date = new Date().toISOString().split('T')[0];
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="strapped-shipping-${date}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF Error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF: ' + err.message }, { status: 500 });
  }
}
