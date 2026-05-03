// ============================================================
// Create Supabase Storage bucket + Upload local JSON data files
// ============================================================
// Usage: node scripts/upload_to_supabase.js
//
// Requires env vars (set in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'data-storage';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_DIR = path.join(__dirname, '..', 'data');

async function ensureBucket() {
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 52428800, // 50MB
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists`);
    } else {
      console.error(`❌ Failed to create bucket: ${error.message}`);
      throw error;
    }
  } else {
    console.log(`✅ Created bucket '${BUCKET_NAME}'`);
  }
}

async function uploadFile(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`⏭️  Skipping ${filename} (not found)`);
    return;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filename, content, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    console.error(`❌ Failed to upload ${filename}: ${error.message}`);
  } else {
    const parsed = JSON.parse(content);
    const count = Array.isArray(parsed) ? parsed.length : '?';
    console.log(`✅ Uploaded ${filename} (${count} records)`);
  }
}

async function main() {
  console.log('🚀 Setting up Supabase Storage...\n');

  await ensureBucket();
  console.log('');

  console.log('📤 Uploading data files...\n');
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    await uploadFile(file);
  }

  console.log('\n🎉 All done! Your data is now in Supabase Storage.');
}

main().catch(console.error);
