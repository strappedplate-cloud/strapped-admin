const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXCEL_PATH = 'C:\\Users\\Joshua\\.gemini\\antigravity\\scratch\\strapped-admin\\STRAPPED_ORDER_DATA.xlsx';
const ORDERS_JSON_PATH = path.join(__dirname, '..', 'data', 'orders.json');

function importExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('File not found:', EXCEL_PATH);
    return;
  }

  const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Try to find the header row. Dashboard formatted files often have titles.
  // We'll read it as a 2D array first to find the header.
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

  
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i].includes('Tanggal') || rows[i].includes('Nama')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error('Could not find header row with "Tanggal" or "Nama"');
    return;
  }

  const headers = rows[headerIndex];
  console.log('Detected Headers:', headers);
  
  // Check if sub-headers exist in the next row
  const subHeaders = rows[headerIndex + 1];
  console.log('Potential Sub-headers:', subHeaders);

  const dataRows = rows.slice(headerIndex + 1);
  
  // Transform to objects using the found headers
  const maxLen = Math.max(headers.length, subHeaders ? subHeaders.length : 0);
  const finalHeaders = [];
  for (let i = 0; i < maxLen; i++) {
    const h = headers[i];
    const sh = subHeaders ? String(subHeaders[i] || '') : '';
    // Use sub-header if main header is empty or is a category header
    if (!h || h === 'Order Detail' || h === 'Shipping Note') {
      if (sh) {
        finalHeaders.push(sh);
        continue;
      }
    }
    finalHeaders.push(h || `COL_${i}`);
  }

  console.log('Final Mapped Headers:', finalHeaders);


  const data = dataRows.slice(subHeaders ? 1 : 0).map(row => {
    const obj = {};
    finalHeaders.forEach((h, i) => {
      if (h) obj[h] = row[i];
    });
    return obj;
  }).filter(o => o.Nama || o.Tanggal);

  console.log('Read', data.length, 'valid rows from Excel (header at row', headerIndex + 1, ')');

  const currentOrdersRaw = JSON.parse(fs.readFileSync(ORDERS_JSON_PATH, 'utf-8'));
  const originalIds = [
    "e107a3e3-1338-4f22-8ba0-5aeefd7a59f9",
    "baa6a3d1-ecee-4e6e-99a8-a76146d0f6fe",
    "78b22f7e-56fc-4832-a950-254697935539",
    "6412de66-7dc0-49ed-987e-2565fc323188",
    "785b4c92-0b98-4011-ab6f-35c4b6bc3901"
  ];
  const currentOrders = currentOrdersRaw.filter(o => originalIds.includes(o.id));

  // Define status for "past orders"
  // Shipped more than 7 days ago
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  const newOrders = data.map((row, index) => {
    return {



      id: require('crypto').randomUUID(),
      tanggal_pembelian: parseExcelDate(row['Tanggal'] || row['Date']),
      nama: row['Nama'] || row['Name'] || '',
      channel_pembelian: row['Channel'] || '',
      payment_status: row['Payment'] || '',
      
      // Order Detail
      nomor_plat: row['Nomor Plat'] || row['Plat'] || '',
      form_detail: row['Form Detail'] || '',
      ukuran_plat: row['Size'] || row['Ukuran'] || '',
      jenis_bundling: row['Bundling'] || '',
      qty: parseInt(row['Quantiity'] || row['Quantity'] || row['Qty']) || 1, // Fallback to 1 since it's a number type, but raw cell is used if present.
      finishing: row['Finishing'] || '',
      
      revision_note: row['Revision Note'] || '',
      status: 'shipped', 
      editor_name: row['Editor'] || '',
      production_number: row['Prod #'] || row['Production Number'] || '',
      
      // Shipping Note
      nama_penerima: row['Nama Penerima'] || row['Recipient'] || '',
      no_hp: row['No. HP'] !== undefined ? String(row['No. HP']) : (row['No HP'] !== undefined ? String(row['No HP']) : ''),
      alamat_pengiriman: row['Alamat Lengkap'] || row['Alamat'] || '',
      
      shipped_at: eightDaysAgo.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: row['Notes'] || '',
      urutan_order: parseInt(row['No']) || 1
    };

  });


  const updatedOrders = [...currentOrders, ...newOrders];
  fs.writeFileSync(ORDERS_JSON_PATH, JSON.stringify(updatedOrders, null, 2));
  console.log('Successfully imported', newOrders.length, 'orders to data/orders.json');
}

function parseExcelDate(val) {
  if (!val) return new Date().toISOString().split('T')[0];
  
  if (typeof val === 'number') {
    // Excel date (days since 1900-01-01)
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // Handle DD/MM/YYYY or DD/MM/YY
  if (typeof val === 'string' && val.includes('/')) {
    const parts = val.split('/');
    if (parts.length === 3) {
      let day = parts[0].padStart(2, '0');
      let month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      if (year.length === 2) year = '20' + year;
      
      return `${year}-${month}-${day}`;
    }
  }

  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
}



importExcel();
