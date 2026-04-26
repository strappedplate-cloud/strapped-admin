// Seed script - Run with: node scripts/seed.js
// Creates default admin user and sample orders

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create default admin user
const adminPassword = bcrypt.hashSync('admin123', 10);
const users = [
  {
    id: uuidv4(),
    username: 'admin',
    password: adminPassword,
    name: 'Admin Strapped',
    role: 'admin',
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    username: 'josh',
    password: bcrypt.hashSync('strapped2024', 10),
    name: 'Joshua',
    role: 'admin',
    created_at: new Date().toISOString(),
  },
];

// Sample orders
const now = new Date();
const orders = [
  {
    id: uuidv4(),
    form_detail: 'STR-001',
    nama: 'Andi Wijaya',
    tanggal_pembelian: new Date(now.getTime() - 2 * 86400000).toISOString(),
    channel_pembelian: 'Shopee',
    no_hp: '081234567890',
    alamat_pengiriman: 'Jl. Sudirman No. 123, Jakarta Selatan',
    jenis_bundling: 'Bundling A',
    ukuran_plat: '46x16',
    qty: 1,
    urutan_order: 1,
    status: 'not_started',
    notes: '',
    shipped_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: uuidv4(),
    form_detail: 'STR-002',
    nama: 'Budi Santoso',
    tanggal_pembelian: new Date(now.getTime() - 1 * 86400000).toISOString(),
    channel_pembelian: 'WhatsApp',
    no_hp: '082345678901',
    alamat_pengiriman: 'Jl. Gatot Subroto No. 45, Bandung',
    jenis_bundling: 'Bundling B',
    ukuran_plat: '46x16',
    qty: 2,
    urutan_order: 1,
    status: 'editing_progress',
    notes: 'Customer minta font custom',
    shipped_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: uuidv4(),
    form_detail: 'STR-003',
    nama: 'Citra Dewi',
    tanggal_pembelian: new Date(now.getTime() - 3 * 86400000).toISOString(),
    channel_pembelian: 'Instagram',
    no_hp: '083456789012',
    alamat_pengiriman: 'Jl. Diponegoro No. 78, Surabaya',
    jenis_bundling: 'Single',
    ukuran_plat: '34x12',
    qty: 1,
    urutan_order: 1,
    status: 'design_approved',
    notes: '',
    shipped_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: uuidv4(),
    form_detail: 'STR-004',
    nama: 'Dimas Pratama',
    tanggal_pembelian: new Date(now.getTime() - 4 * 86400000).toISOString(),
    channel_pembelian: 'Tokopedia',
    no_hp: '084567890123',
    alamat_pengiriman: 'Jl. Ahmad Yani No. 12, Semarang',
    jenis_bundling: 'Bundling A',
    ukuran_plat: '46x16',
    qty: 1,
    urutan_order: 1,
    status: 'production',
    notes: 'Priority order',
    shipped_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  {
    id: uuidv4(),
    form_detail: 'STR-005',
    nama: 'Eka Putri',
    tanggal_pembelian: new Date(now.getTime() - 5 * 86400000).toISOString(),
    channel_pembelian: 'Shopee',
    no_hp: '085678901234',
    alamat_pengiriman: 'Jl. Merdeka No. 56, Yogyakarta',
    jenis_bundling: 'Bundling C',
    ukuran_plat: '46x16',
    qty: 1,
    urutan_order: 1,
    status: 'packed',
    notes: '',
    shipped_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

const resellers = [
  {
    id: uuidv4(),
    nama: 'Toko Plat Jaya',
    no_hp: '081111222333',
    alamat: 'Jl. Mangga Dua No. 10, Jakarta',
    channel: 'WhatsApp',
    notes: 'Reseller aktif sejak 2023',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

fs.writeFileSync(path.join(DATA_DIR, 'users.json'), JSON.stringify(users, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'orders.json'), JSON.stringify(orders, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'resellers.json'), JSON.stringify(resellers, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'packing.json'), JSON.stringify([], null, 2));

console.log('✅ Seed data created successfully!');
console.log(`   Users: ${users.length} (admin/admin123, josh/strapped2024)`);
console.log(`   Orders: ${orders.length}`);
console.log(`   Resellers: ${resellers.length}`);
