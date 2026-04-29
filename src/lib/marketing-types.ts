// ============================================================
// Strapped Admin - Marketing Type Definitions
// ============================================================

export type ContentStatus = 
  | 'briefing'
  | 'photoshoot'
  | 'editing'
  | 'review'
  | 'caption_writing'
  | 'scheduled'
  | 'published';

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  briefing: 'Briefing',
  photoshoot: 'Photoshoot',
  editing: 'Editing',
  review: 'Review',
  caption_writing: 'Caption Writing',
  scheduled: 'Scheduled',
  published: 'Published',
};

export const CONTENT_STATUS_COLORS: Record<ContentStatus, string> = {
  briefing: '#6b7280',
  photoshoot: '#f59e0b',
  editing: '#3b82f6',
  review: '#8b5cf6',
  caption_writing: '#f97316',
  scheduled: '#14b8a6',
  published: '#10b981',
};

export interface MarketingContent {
  id: string;
  nama_konten: string;
  mobil: string;
  status: ContentStatus;
  link_foto: string;
  caption: string;
  platform: 'instagram' | 'tiktok' | 'both';
  assigned_to: string;
  notes: string;
  publish_date: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoshootItem {
  id: string;
  mobil: string;
  lokasi: string;
  tanggal: string;
  contact_name: string;
  contact_phone: string;
  status: 'planned' | 'confirmed' | 'done' | 'cancelled';
  notes: string;
  foto_count: number;
  created_at: string;
  updated_at: string;
}

export const PHOTOSHOOT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  confirmed: 'Confirmed',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const PHOTOSHOOT_STATUS_COLORS: Record<string, string> = {
  planned: '#6b7280',
  confirmed: '#3b82f6',
  done: '#10b981',
  cancelled: '#ef4444',
};
