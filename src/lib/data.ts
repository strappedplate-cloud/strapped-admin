// ============================================================
// Strapped Admin - Data Access Layer (JSON File Storage)
// ============================================================
// This module provides CRUD operations using local JSON files.
// For production on Vercel, this should be replaced with
// Vercel Postgres or another persistent storage solution.

import fs from 'fs';
import path from 'path';
import { Order, User, Reseller, PackingItem } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultValue: T[]): T[] {
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

function writeJsonFile<T>(filename: string, data: T[]): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// ─── Orders ──────────────────────────────────────────────────

export function getOrders(): Order[] {
  return readJsonFile<Order>('orders.json', []);
}

export function getOrderById(id: string): Order | undefined {
  const orders = getOrders();
  return orders.find(o => o.id === id);
}

export function createOrder(order: Order): Order {
  const orders = getOrders();
  orders.push(order);
  writeJsonFile('orders.json', orders);
  return order;
}

export function updateOrder(id: string, updates: Partial<Order>): Order | null {
  const orders = getOrders();
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
  
  writeJsonFile('orders.json', orders);
  return orders[index];
}

export function deleteOrder(id: string): boolean {
  const orders = getOrders();
  const filtered = orders.filter(o => o.id !== id);
  if (filtered.length === orders.length) return false;
  writeJsonFile('orders.json', filtered);
  return true;
}

export function getOngoingOrders(): Order[] {
  const orders = getOrders();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return orders.filter(order => {
    if (order.status !== 'shipped') return true;
    if (order.payment_status !== 'Paid') return true;
    if (!order.shipped_at) return true;
    return new Date(order.shipped_at) > sevenDaysAgo;
  });

}

export function getPastOrders(): Order[] {
  const orders = getOrders();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return orders.filter(order => {
    if (order.status !== 'shipped') return false;
    if (order.payment_status !== 'Paid') return false;
    if (!order.shipped_at) return false;
    return new Date(order.shipped_at) <= sevenDaysAgo;
  });

}

// ─── Users ───────────────────────────────────────────────────

export function getUsers(): User[] {
  return readJsonFile<User>('users.json', []);
}

export function getUserByUsername(username: string): User | undefined {
  const users = getUsers();
  return users.find(u => u.username === username);
}

export function createUser(user: User): User {
  const users = getUsers();
  users.push(user);
  writeJsonFile('users.json', users);
  return user;
}

// ─── Resellers ───────────────────────────────────────────────

export function getResellers(): Reseller[] {
  return readJsonFile<Reseller>('resellers.json', []);
}

export function getResellerById(id: string): Reseller | undefined {
  const resellers = getResellers();
  return resellers.find(r => r.id === id);
}

export function createReseller(reseller: Reseller): Reseller {
  const resellers = getResellers();
  resellers.push(reseller);
  writeJsonFile('resellers.json', resellers);
  return reseller;
}

export function updateReseller(id: string, updates: Partial<Reseller>): Reseller | null {
  const resellers = getResellers();
  const index = resellers.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  resellers[index] = {
    ...resellers[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  writeJsonFile('resellers.json', resellers);
  return resellers[index];
}

export function deleteReseller(id: string): boolean {
  const resellers = getResellers();
  const filtered = resellers.filter(r => r.id !== id);
  if (filtered.length === resellers.length) return false;
  writeJsonFile('resellers.json', filtered);
  return true;
}

// ─── Packing Items ───────────────────────────────────────────

export function getPackingItems(): PackingItem[] {
  return readJsonFile<PackingItem>('packing.json', []);
}

export function createPackingItem(item: PackingItem): PackingItem {
  const items = getPackingItems();
  items.push(item);
  writeJsonFile('packing.json', items);
  return item;
}

export function updatePackingItem(id: string, updates: Partial<PackingItem>): PackingItem | null {
  const items = getPackingItems();
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return null;
  
  items[index] = {
    ...items[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  writeJsonFile('packing.json', items);
  return items[index];
}

export function deletePackingItem(id: string): boolean {
  const items = getPackingItems();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  writeJsonFile('packing.json', filtered);
  return true;
}
