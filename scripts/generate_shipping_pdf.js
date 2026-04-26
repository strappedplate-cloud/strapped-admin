const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ORDERS_JSON_PATH = path.join(__dirname, '../data/orders.json');
const OUTPUT_PATH = path.join(__dirname, '../SHIPPING_GEN_260427.pdf');


function generateShippingPDF() {
  if (!fs.existsSync(ORDERS_JSON_PATH)) {
    console.error('Orders file not found');
    return;
  }

  const orders = JSON.parse(fs.readFileSync(ORDERS_JSON_PATH, 'utf-8'));

  // Filter: production, production_done, packed (tahap produksi ke atas)
  // And exclude shipped (since they are already gone)
  const productionStatuses = ['production', 'production_done', 'packed'];
  
  const filteredOrders = orders
    .filter(o => productionStatuses.includes(o.status))
    .sort((a, b) => new Date(a.tanggal_pembelian) - new Date(b.tanggal_pembelian));

  if (filteredOrders.length === 0) {
    console.log('No orders in production stage to generate PDF.');
    return;
  }

  console.log(`Generating shipping notes for ${filteredOrders.length} orders...`);

  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  const stream = fs.createWriteStream(OUTPUT_PATH);
  doc.pipe(stream);

  const pageWidth = doc.page.width - 60; // 30 margin on each side
  const colWidth = pageWidth / 2;
  const rowHeight = 150; // Adjust as needed
  
  let x = 30;
  let y = 30;

  filteredOrders.forEach((order, index) => {
    // Check if we need a new page
    if (y + rowHeight > doc.page.height - 30) {
      doc.addPage();
      y = 30;
      x = 30;
    }

    // Determine current column
    const currentX = x + (index % 2) * colWidth;
    
    // Draw box border (optional but helpful for alignment)
    doc.rect(currentX, y, colWidth, rowHeight).stroke('#dddddd');

    // Content
    const padding = 10;
    const textX = currentX + padding;
    const textY = y + padding;
    const contentWidth = colWidth - (padding * 2);

    doc.fillColor('#000000');
    
    // Header: [Design], [Size], [Bundling]
    const header = `${order.nomor_plat || '—'}, ${order.ukuran_plat || '—'}, ${order.jenis_bundling || '—'}`;
    doc.fontSize(10).font('Helvetica-Bold').text(header, textX, textY, { width: contentWidth });
    
    // Sender
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text('Pengirim : STRAPPED (0895-7001-57777)', textX, doc.y, { width: contentWidth });
    
    // Receiver
    doc.moveDown(0.5);
    const receiver = `Penerima : ${order.nama_penerima || order.nama || '—'} (${order.no_hp || '—'})`;
    doc.fontSize(9).font('Helvetica-Bold').text(receiver, textX, doc.y, { width: contentWidth });
    
    // Address
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').text(order.alamat_pengiriman || '—', textX, doc.y, { width: contentWidth });

    // Increment Y if we finished a row (every 2 orders)
    if (index % 2 === 1) {
      y += rowHeight;
    }
  });

  doc.end();
  
  stream.on('finish', () => {
    console.log(`Successfully generated PDF: ${OUTPUT_PATH}`);
  });
}

generateShippingPDF();
