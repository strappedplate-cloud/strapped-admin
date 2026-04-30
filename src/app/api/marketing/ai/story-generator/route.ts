import { NextRequest, NextResponse } from 'next/server';

// Google Gemini API for generating Instagram Story concepts (FREE)
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { occasion, theme, brand_message, style, include_promo } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi. Dapatkan API key GRATIS di aistudio.google.com/apikey lalu masukkan di .env.local' },
        { status: 500 }
      );
    }

    const prompt = `Kamu adalah creative designer dan copywriter untuk brand "Strapped Indonesia" (custom plate frame premium mobil).
Kamu akan membuat konsep dan copywriting untuk Instagram Story.
Hasilkan output dengan format berikut:

1. **HEADLINE** — Teks utama yang muncul di story (singkat, impactful, max 8 kata)
2. **SUBHEADLINE** — Teks pendukung (1 kalimat)
3. **CTA (Call to Action)** — Ajakan bertindak
4. **COLOR PALETTE** — Rekomendasi 3 warna (hex code) yang cocok dengan tema
5. **LAYOUT SUGGESTION** — Deskripsi singkat tata letak visual
6. **COPY VARIATIONS** — 3 variasi teks alternatif

Gunakan bahasa Indonesia yang natural dan engaging.
Brand tone: premium, modern, automotive lifestyle.

Buatkan konsep Instagram Story untuk:
Occasion/Hari Raya: ${occasion || 'umum'}
Theme: ${theme || 'automotive lifestyle'}
Brand Message: ${brand_message || 'Strapped - Premium Plate Frame'}
Style: ${style || 'modern minimalist'}
${include_promo ? `Promo yang ingin disampaikan: ${include_promo}` : ''}`;

    const response = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.8,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json(
        { error: `AI API error: ${response.status}. Pastikan GEMINI_API_KEY valid.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({
      result: generatedText,
      model: 'gemini-1.5-flash',
    });
  } catch (err: any) {
    console.error('Story generator AI error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
