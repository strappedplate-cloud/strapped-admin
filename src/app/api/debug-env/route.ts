import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Try to read from Supabase if keys exist
  let supabaseTest = 'Not attempted';
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase.storage.from('data-storage').download('orders.json');
      if (error) {
        supabaseTest = `Download error: ${JSON.stringify(error)}`;
      } else {
        const text = await data.text();
        const orders = JSON.parse(text);
        supabaseTest = `Success - ${orders.length} orders found`;
      }
    } catch (e: any) {
      supabaseTest = `Exception: ${e.message}`;
    }
  }

  return NextResponse.json({
    supabase_url_set: !!supabaseUrl,
    supabase_url_value: supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : null,
    service_role_key_set: !!supabaseServiceKey,
    anon_key_set: !!supabaseAnonKey,
    supabase_read_test: supabaseTest,
    node_env: process.env.NODE_ENV,
  });
}
