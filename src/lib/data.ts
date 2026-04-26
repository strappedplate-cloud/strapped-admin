// ============================================================
// Strapped Admin - Data Access Layer (JSON File Storage)
// ============================================================
// This module provides CRUD operations using local JSON files.
// For production on Vercel, this should be replaced with
// Vercel Postgres or another persistent storage solution.

import fs from 'fs';
import path from 'path';
import { Order, User, Reseller, PackingItem, AccessRequest, ChatMessage } from './types';

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

export function writeJsonFile<T>(filename: string, data: T[]): void {
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
    if (order.force_past) return false;
    if (order.status !== 'shipped') return true;
    
    const isOldData = new Date(order.created_at || order.tanggal_pembelian) < new Date('2026-04-26');
    if (!isOldData && order.payment_status !== 'Paid') return true;
    
    if (!order.shipped_at && isOldData) return false;
    if (!order.shipped_at) return true;
    
    return new Date(order.shipped_at) > sevenDaysAgo;
  });

}

export function getPastOrders(): Order[] {
  const orders = getOrders();
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

export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = {
    ...users[index],
    ...updates,
    // note: if updating password, it should be pre-hashed before calling this
  };
  writeJsonFile('users.json', users);
  return users[index];
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return false;
  writeJsonFile('users.json', filtered);
  return true;
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

// ─── Access Requests ──────────────────────────────────────────

export function getAccessRequests(): AccessRequest[] {
  return readJsonFile<AccessRequest>('access_requests.json', []);
}

export function createAccessRequest(req: AccessRequest): AccessRequest {
  const requests = getAccessRequests();
  requests.push(req);
  writeJsonFile('access_requests.json', requests);
  return req;
}

export function updateAccessRequest(id: string, status: 'approved' | 'rejected'): AccessRequest | null {
  const requests = getAccessRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  requests[index].status = status;
  writeJsonFile('access_requests.json', requests);
  return requests[index];
}

// ─── Chat Messages ────────────────────────────────────────────

export function getMessages(): ChatMessage[] {
  return readJsonFile<ChatMessage>('messages.json', []);
}

export function getMessagesBetween(userA: string, userB: string): ChatMessage[] {
  const messages = getMessages();
  // Auto-delete messages older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const valid = messages.filter(m => new Date(m.created_at) > thirtyDaysAgo);
  if (valid.length !== messages.length) {
    writeJsonFile('messages.json', valid);
  }
  return valid.filter(m =>
    (m.from_user_id === userA && m.to_user_id === userB) ||
    (m.from_user_id === userB && m.to_user_id === userA)
  );
}

export function createMessage(msg: ChatMessage): ChatMessage {
  const messages = getMessages();
  // Purge messages older than 30 days on write too
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const valid = messages.filter(m => new Date(m.created_at) > thirtyDaysAgo);
  valid.push(msg);
  writeJsonFile('messages.json', valid);
  return msg;
}

export function markMessagesRead(fromUserId: string, toUserId: string): void {
  const messages = getMessages();
  let changed = false;
  messages.forEach(m => {
    if (m.from_user_id === fromUserId && m.to_user_id === toUserId && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) writeJsonFile('messages.json', messages);
}

export function getUnreadCount(toUserId: string): Record<string, number> {
  const messages = getMessages();
  const counts: Record<string, number> = {};
  messages.forEach(m => {
    if (m.to_user_id === toUserId && !m.read) {
      counts[m.from_user_id] = (counts[m.from_user_id] || 0) + 1;
    }
  });
  return counts;
}

// ─── Online Presence ──────────────────────────────────────────

function readPresence(): Record<string, string> {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, 'online_presence.json');
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify({}));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return {};
  }
}

function writePresence(data: Record<string, string>): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, 'online_presence.json');
  fs.writeFileSync(filepath, JSON.stringify(data));
}

export function updatePresence(userId: string): void {
  const presence = readPresence();
  presence[userId] = new Date().toISOString();
  writePresence(presence);
}

export function getOnlineUsers(thresholdSeconds = 30): string[] {
  const presence = readPresence();
  const threshold = new Date(Date.now() - thresholdSeconds * 1000);
  return Object.entries(presence)
    .filter(([, lastSeen]) => new Date(lastSeen) > threshold)
    .map(([userId]) => userId);
}
