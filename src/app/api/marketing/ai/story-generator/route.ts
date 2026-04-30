import { NextRequest, NextResponse } from 'next/server';

// Claude AI API for generating Instagram Story text/concepts
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { occasion, theme, brand_message, style, include_promo } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here' || !apiKey.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY belum dikonfigurasi. Dapatkan API key di console.anthropic.com lalu masukkan di .env.local (lokal) atau Vercel Environment Variables (production).' },
        { status: 500 }
      );
    }

    const systemPrompt = `Kamu adalah creative designer dan copywriter untuk brand "Strapped Indonesia" (custom plate frame premium mobil).
Kamu akan membuat konsep dan copywriting untuk Instagram Story.
Hasilkan output dengan format berikut:

1. **HEADLINE** — Teks utama yang muncul di story (singkat, impactful, max 8 kata)
2. **SUBHEADLINE** — Teks pendukung (1 kalimat)
3. **CTA (Call to Action)** — Ajakan bertindak
4. **COLOR PALETTE** — Rekomendasi 3 warna (hex code) yang cocok dengan tema
5. **LAYOUT SUGGESTION** — Deskripsi singkat tata letak visual
6. **COPY VARIATIONS** — 3 variasi teks alternatif

Gunakan bahasa Indonesia yang natural dan engaging.
Brand tone: premium, modern, automotive lifestyle.`;

    const userPrompt = `Buatkan konsep Instagram Story untuk:
Occasion/Hari Raya: ${occasion || 'umum'}
Theme: ${theme || 'automotive lifestyle'}
Brand Message: ${brand_message || 'Strapped - Premium Plate Frame'}
Style: ${style || 'modern minimalist'}
${include_promo ? `Promo yang ingin disampaikan: ${include_promo}` : ''}`;

    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json(
        { error: `AI API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const generatedText = data.content?.[0]?.text || '';

    return NextResponse.json({
      result: generatedText,
      model: data.model,
      usage: data.usage,
    });
  } catch (err: any) {
    console.error('Story generator AI error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
