import { NextRequest, NextResponse } from 'next/server';
import { getOrders } from '@/lib/data';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2011\u2012\u2013\u2014\u2015]/g, '-') // replace various dashes with standard hyphen
    .replace(/[\u2018\u2019]/g, "'") // replace smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // replace smart double quotes
    .replace(/[^\x00-\x7F]/g, '');   // strip any other non-ASCII characters
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

export async function GET(req: NextRequest) {
  try {
    const orders = getOrders();
    const productionStatuses = ['production'];
    
    const filteredOrders = orders
      .filter(o => productionStatuses.includes(o.status))
      .sort((a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime());

    if (filteredOrders.length === 0) {
      return NextResponse.json({ error: 'No orders in production stage' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);


    const margin = 20; // narrow margin
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const colWidth = (pageWidth - 2 * margin) / 2;
    const fontSize = 8;
    const lineHeight = fontSize * 1.2;
    const padding = 8;
    const contentWidth = colWidth - 2 * padding;
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentTop = margin;

    // Helper to calculate cell height
    const calcHeight = (order: any) => {
      let h = 0;
      
      const headerText = `${order.nomor_plat || '—'}, ${order.ukuran_plat || '—'}, ${order.jenis_bundling || '—'}`;
      const headerLines = wrapText(headerText, contentWidth, fontBold, fontSize);
      h += headerLines.length * lineHeight + 4; // text + margin

      h += lineHeight + 8; // sender text + margin

      const receiverText = `Penerima : ${order.nama_penerima || order.nama || '—'} (${order.no_hp || '—'})`;
      const receiverLines = wrapText(receiverText, contentWidth, fontBold, fontSize);
      h += receiverLines.length * lineHeight + 4; // text + margin

      const addressLines = wrapText(order.alamat_pengiriman || '—', contentWidth, fontRegular, fontSize);
      h += addressLines.length * lineHeight;

      return h + 2 * padding;
    };

    for (let i = 0; i < filteredOrders.length; i += 2) {
      const order1 = filteredOrders[i];
      const order2 = filteredOrders[i + 1];

      const height1 = calcHeight(order1);
      const height2 = order2 ? calcHeight(order2) : 0;
      const rowHeight = Math.max(height1, height2);

      // Check page break
      if (currentTop + rowHeight > pageHeight - margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        currentTop = margin;
      }

      // Draw Col 1
      page.drawRectangle({
        x: margin,
        y: pageHeight - currentTop - rowHeight,
        width: colWidth,
        height: rowHeight,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 0.5,
      });

      let textTop = currentTop + padding;
      const x1 = margin + padding;
      
      // Col 1 Content
      const headerText1 = `${order1.nomor_plat || '—'}, ${order1.ukuran_plat || '—'}, ${order1.jenis_bundling || '—'}`;
      for (const line of wrapText(headerText1, contentWidth, fontBold, fontSize)) {
        page.drawText(line, { x: x1, y: pageHeight - textTop - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
      textTop += 4;
      
      page.drawText('Pengirim : STRAPPED (0895-7001-57777)', { x: x1, y: pageHeight - textTop - fontSize, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
      textTop += lineHeight + 8;
      
      const receiverText1 = `Penerima : ${order1.nama_penerima || order1.nama || '—'} (${order1.no_hp || '—'})`;
      for (const line of wrapText(receiverText1, contentWidth, fontBold, fontSize)) {
        page.drawText(line, { x: x1, y: pageHeight - textTop - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }
      textTop += 4;
      
      for (const line of wrapText(order1.alamat_pengiriman || '—', contentWidth, fontRegular, fontSize)) {
        page.drawText(line, { x: x1, y: pageHeight - textTop - fontSize, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
        textTop += lineHeight;
      }

      // Draw Col 2
      if (order2) {
        page.drawRectangle({
          x: margin + colWidth,
          y: pageHeight - currentTop - rowHeight,
          width: colWidth,
          height: rowHeight,
          borderColor: rgb(0.5, 0.5, 0.5),
          borderWidth: 0.5,
        });

        let textTop2 = currentTop + padding;
        const x2 = margin + colWidth + padding;
        
        const headerText2 = `${order2.nomor_plat || '—'}, ${order2.ukuran_plat || '—'}, ${order2.jenis_bundling || '—'}`;
        for (const line of wrapText(headerText2, contentWidth, fontBold, fontSize)) {
          page.drawText(line, { x: x2, y: pageHeight - textTop2 - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
          textTop2 += lineHeight;
        }
        textTop2 += 4;
        
        page.drawText('Pengirim : STRAPPED (0895-7001-57777)', { x: x2, y: pageHeight - textTop2 - fontSize, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
        textTop2 += lineHeight + 8;
        
        const receiverText2 = `Penerima : ${order2.nama_penerima || order2.nama || '—'} (${order2.no_hp || '—'})`;
        for (const line of wrapText(receiverText2, contentWidth, fontBold, fontSize)) {
          page.drawText(line, { x: x2, y: pageHeight - textTop2 - fontSize, size: fontSize, font: fontBold, color: rgb(0, 0, 0) });
          textTop2 += lineHeight;
        }
        textTop2 += 4;
        
        for (const line of wrapText(order2.alamat_pengiriman || '—', contentWidth, fontRegular, fontSize)) {
          page.drawText(line, { x: x2, y: pageHeight - textTop2 - fontSize, size: fontSize, font: fontRegular, color: rgb(0, 0, 0) });
          textTop2 += lineHeight;
        }
      }

      currentTop += rowHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const date = new Date().toISOString().split('T')[0];
    const filename = `strapped-shipping note-${date}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (err: any) {
    console.error('PDF Generation Error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF: ' + err.message }, { status: 500 });
  }
}
