// ============================================================
// Strapped Admin - Marketing Data Access Layer
// ============================================================

import { MarketingContent, PhotoshootItem } from './marketing-types';
import { readJsonFile, writeJsonFile } from './data';

// ─── Marketing Content ──────────────────────────────────────

export async function getMarketingContents(): Promise<MarketingContent[]> {
  return readJsonFile<MarketingContent>('marketing_contents.json', []);
}

export async function getMarketingContentById(id: string): Promise<MarketingContent | undefined> {
  const items = await getMarketingContents();
  return items.find(i => i.id === id);
}

export async function createMarketingContent(item: MarketingContent): Promise<MarketingContent> {
  const items = await getMarketingContents();
  items.push(item);
  await writeJsonFile('marketing_contents.json', items);
  return item;
}

export async function updateMarketingContent(id: string, updates: Partial<MarketingContent>): Promise<MarketingContent | null> {
  const items = await getMarketingContents();
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
  await writeJsonFile('marketing_contents.json', items);
  return items[index];
}

export async function deleteMarketingContent(id: string): Promise<boolean> {
  const items = await getMarketingContents();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeJsonFile('marketing_contents.json', filtered);
  return true;
}

// ─── Photoshoot Items ───────────────────────────────────────

export async function getPhotoshootItems(): Promise<PhotoshootItem[]> {
  return readJsonFile<PhotoshootItem>('photoshoot_items.json', []);
}

export async function getPhotoshootItemById(id: string): Promise<PhotoshootItem | undefined> {
  const items = await getPhotoshootItems();
  return items.find(i => i.id === id);
}

export async function createPhotoshootItem(item: PhotoshootItem): Promise<PhotoshootItem> {
  const items = await getPhotoshootItems();
  items.push(item);
  await writeJsonFile('photoshoot_items.json', items);
  return item;
}

export async function updatePhotoshootItem(id: string, updates: Partial<PhotoshootItem>): Promise<PhotoshootItem | null> {
  const items = await getPhotoshootItems();
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
  await writeJsonFile('photoshoot_items.json', items);
  return items[index];
}

export async function deletePhotoshootItem(id: string): Promise<boolean> {
  const items = await getPhotoshootItems();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  await writeJsonFile('photoshoot_items.json', filtered);
  return true;
}
