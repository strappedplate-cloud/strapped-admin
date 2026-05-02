// ============================================================
// Strapped Admin - Supabase Storage Layer
// ============================================================
// Reads and writes JSON files to the Supabase Storage bucket.
// Used in production (Vercel) where the local filesystem is read-only.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service role key to bypass RLS for server-side storage access
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'data-storage';

const fileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5_000; // 5 seconds

export async function readSupabaseJson<T>(
  filepath: string,
  defaultValue: T[] = []
): Promise<{ data: T[]; sha: string }> {
  // Check cache
  const cached = fileCache.get(filepath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { data: cached.data as T[], sha: '' };
  }

  // Remove leading 'data/' if it exists, as the bucket root is the data folder
  const cleanPath = filepath.startsWith('data/') ? filepath.substring(5) : filepath;

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(cleanPath);

  if (error || !data) {
    // If not found, it might be the first time reading it.
    return { data: defaultValue, sha: '' };
  }

  const content = await data.text();
  let parsed: T[];
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    parsed = defaultValue;
  }

  fileCache.set(filepath, { data: parsed, timestamp: Date.now() });

  return { data: parsed, sha: '' };
}

export async function writeSupabaseJson<T>(
  filepath: string,
  data: T[],
  message?: string
): Promise<void> {
  const cleanPath = filepath.startsWith('data/') ? filepath.substring(5) : filepath;
  const content = JSON.stringify(data, null, 2);

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(cleanPath, content, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    throw new Error(`Supabase write error for ${filepath}: ${error.message}`);
  }

  // Update cache
  fileCache.set(filepath, { data, timestamp: Date.now() });
}

export function invalidateCache(filepath: string): void {
  fileCache.delete(filepath);
}
