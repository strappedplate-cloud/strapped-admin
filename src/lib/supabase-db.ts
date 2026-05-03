// ============================================================
// Strapped Admin - Supabase Database Layer (PostgreSQL)
// ============================================================
// Uses proper relational tables — data loss is near-impossible
// compared to single-file JSON storage.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not set.');
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

// ─── Generic Helpers ──────────────────────────────────────────

/**
 * Read all rows from a table.
 */
export async function dbReadAll<T>(table: string): Promise<T[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(`DB read error [${table}]: ${error.message}`);
  return (data ?? []) as T[];
}

/**
 * Read a single row by id.
 */
export async function dbReadById<T>(table: string, id: string): Promise<T | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`DB read by id error [${table}/${id}]: ${error.message}`);
  }
  return data as T;
}

/**
 * Insert a new row.
 */
export async function dbInsert<T>(table: string, row: T): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).insert(row as any).select().single();
  if (error) throw new Error(`DB insert error [${table}]: ${error.message}`);
  return data as T;
}

/**
 * Update a row by id. Returns updated row.
 */
export async function dbUpdate<T>(table: string, id: string, updates: Partial<T>): Promise<T | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .update({ ...(updates as any), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`DB update error [${table}/${id}]: ${error.message}`);
  }
  return data as T;
}

/**
 * Delete a row by id.
 */
export async function dbDelete(table: string, id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error, count } = await supabase.from(table).delete({ count: 'exact' }).eq('id', id);
  if (error) throw new Error(`DB delete error [${table}/${id}]: ${error.message}`);
  return (count ?? 0) > 0;
}

/**
 * Bulk upsert — safe for large data sets.
 * Used by the migration script and any full-table writes.
 */
export async function dbUpsertMany<T extends object>(table: string, rows: T[], conflictColumn = 'id'): Promise<void> {
  const supabase = getSupabase();
  const CHUNK_SIZE = 100;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk as any[], { onConflict: conflictColumn });
    if (error) throw new Error(`DB upsert error [${table}]: ${error.message}`);
  }
}

export { getSupabase };
