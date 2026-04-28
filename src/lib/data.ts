// ============================================================
// Strapped Admin - Data Access Layer (Async, Dual Backend)
// ============================================================
// In development (no GITHUB_TOKEN): uses local JSON files.
// In production (GITHUB_TOKEN set): uses GitHub API.
// All functions are async.

import fs from 'fs';
import path from 'path';
import { Order, User, Reseller, PackingItem, AccessRequest } from './types';
import { readGithubJson, writeGithubJson } from './github-storage';

const DATA_DIR = path.join(process.cwd(), 'data');
const USE_GITHUB = !!process.env.GITHUB_TOKEN;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function readJsonFile<T>(filename: string, defaultValue: T[] = []): Promise<T[]> {
  if (USE_GITHUB) {
    const { data } = await readGithubJson<T>(`data/${filename}`, defaultValue);
    return data;
  }

  // Local filesystem (development)
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJsonFileInternal<T>(filename: string, data: T[]): Promise<void> {
  if (USE_GITHUB) {
    await writeGithubJson<T>(`data/${filename}`, data);
    return;
  }

  // Local filesystem (development)
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// Public export for direct writes (used by access-requests/[id])
export async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  await writeJsonFileInternal(filename, data);
}

// ─── Orders ──────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  return readJsonFile<Order>('orders.json', []);
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const orders = await getOrders();
  return orders.find(o => o.id === id);
}

export async function createOrder(order: Order): Promise<Order> {
  const orders = await getOrders();
  orders.push(order);
  await writeJsonFileInternal('orders.json', orders);
  return order;
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
  const orders = await getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // If status changed to 'shipped', set shipped_at
  if (updates.status === 'shipped' && !orders[index].shipped_at) {
    orders[index].shipped_at = new Date().toISOString();
  }

  await writeJsonFileInternal('orders.json', orders);
  return orders[index];
}

export async function deleteOrder(id: string): Promise<boolean> {
  const orders = await getOrders();
  const filtered = orders.filter(o => o.id !== id);
  if (filtered.length === orders.length) return false;
  await writeJsonFileInternal('orders.json', filtered);
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
  return readJsonFile<User>('users.json', []);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.username === username);
}

export async function createUser(user: User): Promise<User> {
  const users = await getUsers();
  users.push(user);
  await writeJsonFileInternal('users.json', users);
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...updates,
    // note: if updating password, it should be pre-hashed before calling this
  };
  await writeJsonFileInternal('users.json', users);
  return users[index];
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return false;
  await writeJsonFileInternal('users.json', filtered);
  return true;
}

// ─── Resellers ───────────────────────────────────────────────

export async function getResellers(): Promise<Reseller[]> {
  return readJsonFile<Reseller>('resellers.json', []);
}

export async function getResellerById(id: string): Promise<Reseller | undefined> {
  const resellers = await getResellers();
  return resellers.find(r => r.id === id);
}

export async function createReseller(reseller: Reseller): Promise<Reseller> {
  const resellers = await getResellers();
  resellers.push(reseller);
  await writeJsonFileInternal('resellers.json', resellers);
  return reseller;
}

export async function updateReseller(id: string, updates: Partial<Reseller>): Promise<Reseller | null> {
  const resellers = await getResellers();
  const index = resellers.findIndex(r => r.id === id);
  if (index === -1) return null;

  resellers[index] = {
    ...resellers[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await writeJsonFileInternal('resellers.json', resellers);
  return resellers[index];
}

export async function deleteReseller(id: string): Promise<boolean> {
  const resellers = await getResellers();
  const filtered = resellers.filter(r => r.id !== id);
  if (filtered.length === resellers.length) return false;
  await writeJsonFileInternal('resellers.json', filtered);
  return true;
}

// ─── Packing Items ───────────────────────────────────────────

export async function getPackingItems(): Promise<PackingItem[]> {
  return readJsonFile<PackingItem>('packing.json', []);
}

export async function createPackingItem(item: PackingItem): Promise<PackingItem> {
  const items = await getPackingItems();
  items.push(item);
  await writeJsonFileInternal('packing.json', items);
  return item;
}

export async function updatePackingItem(id: string, updates: Partial<PackingItem>): Promise<PackingItem | null> {
  const items = await getPackingItems();
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return null;

  items[index] = {
    ...items[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await writeJsonFileInternal('packing.json', items);
  return items[index];
}

export async function deletePackingItem(id: string): Promise<boolean> {
  const items = await getPackingItems();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeJsonFileInternal('packing.json', filtered);
  return true;
}

// ─── Access Requests ──────────────────────────────────────────

export async function getAccessRequests(): Promise<AccessRequest[]> {
  return readJsonFile<AccessRequest>('access_requests.json', []);
}

export async function createAccessRequest(req: AccessRequest): Promise<AccessRequest> {
  const requests = await getAccessRequests();
  requests.push(req);
  await writeJsonFileInternal('access_requests.json', requests);
  return req;
}

export async function updateAccessRequest(id: string, status: 'approved' | 'rejected'): Promise<AccessRequest | null> {
  const requests = await getAccessRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;

  requests[index].status = status;
  await writeJsonFileInternal('access_requests.json', requests);
  return requests[index];
}
