// ============================================================
// Strapped Admin - Data Access Layer (Supabase PostgreSQL)
// ============================================================
// All data is stored in proper relational tables.
// Fallback: local JSON filesystem for development (no env vars set).

import fs from 'fs';
import path from 'path';
import { Order, User, Reseller, PackingItem, AccessRequest } from './types';
import { dbReadAll, dbReadById, dbInsert, dbUpdate, dbDelete } from './supabase-db';

const DATA_DIR = path.join(process.cwd(), 'data');
// Only use Supabase PostgreSQL tables when explicitly opted in via DATA_BACKEND=db
// Default: local JSON files (dev) or Supabase Storage (production)
const USE_SUPABASE = process.env.DATA_BACKEND === 'db';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function readJsonFile<T>(filename: string, defaultValue: T[] = []): Promise<T[]> {
  if (process.env.DATA_BACKEND === 'storage') {
    const { readSupabaseJson } = await import('./supabase-storage');
    const { data } = await readSupabaseJson<T>(`data/${filename}`, defaultValue);
    return data;
  }

  // Map filename to table name
  const tableMap: Record<string, string> = {
    'orders.json': 'orders',
    'users.json': 'users',
    'resellers.json': 'resellers',
    'packing.json': 'packing_items',
    'access_requests.json': 'access_requests',
    'marketing_contents.json': 'marketing_contents',
    'photoshoot_items.json': 'photoshoot_items',
  };
  const table = tableMap[filename];

  if (USE_SUPABASE && table) {
    return dbReadAll<T>(table);
  }

  // Local filesystem (development)
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    try { fs.writeFileSync(filepath, JSON.stringify(defaultValue, null, 2)); } catch {}
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

// Keep writeJsonFile for marketing-data.ts compatibility (it calls this directly)
export async function writeJsonFile<T extends object>(filename: string, data: T[]): Promise<void> {
  if (process.env.DATA_BACKEND === 'storage') {
    const { writeSupabaseJson } = await import('./supabase-storage');
    await writeSupabaseJson<T>(`data/${filename}`, data);
    return;
  }

  const tableMap: Record<string, string> = {
    'marketing_contents.json': 'marketing_contents',
    'photoshoot_items.json': 'photoshoot_items',
  };
  const table = tableMap[filename];
  if (USE_SUPABASE && table) {
    const { dbUpsertMany } = await import('./supabase-db');
    await dbUpsertMany<T>(table, data);
    return;
  }
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  try { fs.writeFileSync(filepath, JSON.stringify(data, null, 2)); } catch(e) { console.error('Write error', e); }
}

// ─── Orders ──────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  if (USE_SUPABASE) return dbReadAll<Order>('orders');
  return readJsonFile<Order>('orders.json', []);
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  if (USE_SUPABASE) {
    const order = await dbReadById<Order>('orders', id);
    return order ?? undefined;
  }
  const orders = await getOrders();
  return orders.find(o => o.id === id);
}

export async function createOrder(order: Order): Promise<Order> {
  if (USE_SUPABASE) return dbInsert<Order>('orders', order);
  const orders = await getOrders();
  orders.push(order);
  await writeJsonFile('orders.json', orders);
  return order;
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
  if (USE_SUPABASE) {
    // If status changed to 'shipped', set shipped_at
    const extra: Partial<Order> = {};
    if (updates.status === 'shipped') {
      const existing = await dbReadById<Order>('orders', id);
      if (!existing?.shipped_at) extra.shipped_at = new Date().toISOString();
    }
    return dbUpdate<Order>('orders', id, { ...updates, ...extra });
  }
  const orders = await getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...updates, updated_at: new Date().toISOString() };
  if (updates.status === 'shipped' && !orders[index].shipped_at) {
    orders[index].shipped_at = new Date().toISOString();
  }
  await writeJsonFile('orders.json', orders);
  return orders[index];
}

export async function deleteOrder(id: string): Promise<boolean> {
  if (USE_SUPABASE) return dbDelete('orders', id);
  const orders = await getOrders();
  const filtered = orders.filter(o => o.id !== id);
  if (filtered.length === orders.length) return false;
  await writeJsonFile('orders.json', filtered);
  return true;
}

export async function getOngoingOrders(): Promise<Order[]> {
  const orders = await getOrders();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return orders.filter(order => {
    if (order.force_past) return false;
    if (order.status !== 'shipped') return true;

    const isOldData = new Date(order.created_at || order.tanggal_pembelian) < new Date('2026-04-26');
    if (!isOldData && order.payment_status !== 'Paid') return true;

    if (!order.shipped_at && isOldData) return false;
    if (!order.shipped_at) return true;

    return new Date(order.shipped_at) > sevenDaysAgo;
  });
}

export async function getPastOrders(): Promise<Order[]> {
  const orders = await getOrders();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return orders.filter(order => {
    if (order.force_past) return true;
    if (order.status !== 'shipped') return false;

    const isOldData = new Date(order.created_at || order.tanggal_pembelian) < new Date('2026-04-26');
    if (!isOldData && order.payment_status !== 'Paid') return false;

    if (!order.shipped_at && isOldData) return true;
    if (!order.shipped_at) return false;

    return new Date(order.shipped_at) <= sevenDaysAgo;
  });
}

// ─── Users ───────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  // Always use local file for users so login doesn't break, bypassing Supabase entirely
  try {
    const data = fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.username === username);
}

export async function createUser(user: User): Promise<User> {
  if (USE_SUPABASE) return dbInsert<User>('users', user);
  const users = await getUsers();
  users.push(user);
  await writeJsonFile('users.json', users);
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  if (USE_SUPABASE) {
    const { updated_at, ...rest } = updates as any;
    const supabase = (await import('./supabase-db')).getSupabase();
    const { data, error } = await supabase.from('users').update(rest).eq('id', id).select().single();
    if (error) return null;
    return data as User;
  }
  const users = await getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], ...updates };
  await writeJsonFile('users.json', users);
  return users[index];
}

export async function deleteUser(id: string): Promise<boolean> {
  if (USE_SUPABASE) return dbDelete('users', id);
  const users = await getUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return false;
  await writeJsonFile('users.json', filtered);
  return true;
}

// ─── Resellers ───────────────────────────────────────────────

export async function getResellers(): Promise<Reseller[]> {
  if (USE_SUPABASE) return dbReadAll<Reseller>('resellers');
  return readJsonFile<Reseller>('resellers.json', []);
}

export async function getResellerById(id: string): Promise<Reseller | undefined> {
  if (USE_SUPABASE) {
    const r = await dbReadById<Reseller>('resellers', id);
    return r ?? undefined;
  }
  const resellers = await getResellers();
  return resellers.find(r => r.id === id);
}

export async function createReseller(reseller: Reseller): Promise<Reseller> {
  if (USE_SUPABASE) return dbInsert<Reseller>('resellers', reseller);
  const resellers = await getResellers();
  resellers.push(reseller);
  await writeJsonFile('resellers.json', resellers);
  return reseller;
}

export async function updateReseller(id: string, updates: Partial<Reseller>): Promise<Reseller | null> {
  if (USE_SUPABASE) return dbUpdate<Reseller>('resellers', id, updates);
  const resellers = await getResellers();
  const index = resellers.findIndex(r => r.id === id);
  if (index === -1) return null;
  resellers[index] = { ...resellers[index], ...updates, updated_at: new Date().toISOString() };
  await writeJsonFile('resellers.json', resellers);
  return resellers[index];
}

export async function deleteReseller(id: string): Promise<boolean> {
  if (USE_SUPABASE) return dbDelete('resellers', id);
  const resellers = await getResellers();
  const filtered = resellers.filter(r => r.id !== id);
  if (filtered.length === resellers.length) return false;
  await writeJsonFile('resellers.json', filtered);
  return true;
}

// ─── Packing Items ───────────────────────────────────────────

export async function getPackingItems(): Promise<PackingItem[]> {
  if (USE_SUPABASE) return dbReadAll<PackingItem>('packing_items');
  return readJsonFile<PackingItem>('packing.json', []);
}

export async function createPackingItem(item: PackingItem): Promise<PackingItem> {
  if (USE_SUPABASE) return dbInsert<PackingItem>('packing_items', item);
  const items = await getPackingItems();
  items.push(item);
  await writeJsonFile('packing.json', items);
  return item;
}

export async function updatePackingItem(id: string, updates: Partial<PackingItem>): Promise<PackingItem | null> {
  if (USE_SUPABASE) return dbUpdate<PackingItem>('packing_items', id, updates);
  const items = await getPackingItems();
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
  await writeJsonFile('packing.json', items);
  return items[index];
}

export async function deletePackingItem(id: string): Promise<boolean> {
  if (USE_SUPABASE) return dbDelete('packing_items', id);
  const items = await getPackingItems();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeJsonFile('packing.json', filtered);
  return true;
}

// ─── Access Requests ──────────────────────────────────────────

export async function getAccessRequests(): Promise<AccessRequest[]> {
  if (USE_SUPABASE) return dbReadAll<AccessRequest>('access_requests');
  return readJsonFile<AccessRequest>('access_requests.json', []);
}

export async function createAccessRequest(req: AccessRequest): Promise<AccessRequest> {
  if (USE_SUPABASE) return dbInsert<AccessRequest>('access_requests', req);
  const requests = await getAccessRequests();
  requests.push(req);
  await writeJsonFile('access_requests.json', requests);
  return req;
}

export async function updateAccessRequest(id: string, status: 'approved' | 'rejected'): Promise<AccessRequest | null> {
  if (USE_SUPABASE) {
    const supabase = (await import('./supabase-db')).getSupabase();
    const { data, error } = await supabase.from('access_requests').update({ status }).eq('id', id).select().single();
    if (error) return null;
    return data as AccessRequest;
  }
  const requests = await getAccessRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;
  requests[index].status = status;
  await writeJsonFile('access_requests.json', requests);
  return requests[index];
}
