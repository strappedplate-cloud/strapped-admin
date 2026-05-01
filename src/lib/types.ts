// ============================================================
// Strapped Admin - Type Definitions
// ============================================================

export type OrderStatus =
  | 'not_started'
  | 'editing_progress'
  | 'editing_done'
  | 'revision'
  | 'revision_done'
  | 'design_approved'
  | 'prompted_production'
  | 'production'
  | 'defect_production_2'
  | 'production_done'
  | 'packed'
  | 'shipped';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  not_started: 'Not Started',
  editing_progress: 'Editing on Progress',
  editing_done: 'Editing Done',
  revision: 'Revision',
  revision_done: 'Revision Done',
  design_approved: 'Design Approved',
  prompted_production: 'Prompted for Production',
  production: 'Production',
  defect_production_2: 'Defect / Production 2',
  production_done: 'Production Done',
  packed: 'Packed',
  shipped: 'Shipped',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  not_started: '#6b7280',
  editing_progress: '#f59e0b',
  editing_done: '#10b981',
  revision: '#ef4444',
  revision_done: '#f97316',
  design_approved: '#3b82f6',
  prompted_production: '#8b5cf6',
  production: '#6366f1',
  defect_production_2: '#dc2626',
  production_done: '#22c55e',
  packed: '#14b8a6',
  shipped: '#06b6d4',
};

export const ALL_STATUSES: OrderStatus[] = [
  'not_started',
  'editing_progress',
  'editing_done',
  'revision',
  'revision_done',
  'design_approved',
  'prompted_production',
  'production',
  'defect_production_2',
  'production_done',
  'packed',
  'shipped',
];

export type PaymentStatus = 'Paid' | 'DP' | 'Have Not Paid';

export interface Order {
  id: string;
  nama: string;
  channel_pembelian: string;
  reseller_name?: string;
  payment_status: PaymentStatus;

  
  // Order Detail
  nomor_plat: string;
  form_detail: string;
  ukuran_plat: string;
  jenis_bundling: string;
  qty: number;
  finishing: string;
  
  revision_note: string;
  status: OrderStatus;
  editor_name: string;
  production_number: string;
  product_type?: string;
  event_name?: string;

  
  // Shipping Note

  nama_penerima: string;
  no_hp: string;
  alamat_pengiriman: string;

  // Metadata / Legacy
  tanggal_pembelian: string;
  urutan_order: number;
  notes: string;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
  force_past?: boolean;
}


export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email?: string;
  no_hp?: string;
  role: 'admin' | 'member';
  permissions: string[]; // array of paths like '/dashboard', '/orders/ongoing', etc
  created_at: string;
}

export interface Reseller {
  id: string;
  nama: string;
  contact_name?: string;
  no_hp: string;

  alamat: string;
  channel: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PackingItem {
  id: string;
  order_id: string;
  shipping_notes: string;
  packing_needs: string;
  is_packed: boolean;
  created_at: string;
  updated_at: string;
}



export interface AccessRequest {
  id: string;
  user_id: string;
  username: string;
  path: string; // The menu path requested
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
