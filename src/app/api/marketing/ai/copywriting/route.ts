import { NextRequest, NextResponse } from 'next/server';

// Claude AI API for generating Instagram captions and article text
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, mobil, context, tone, language } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY tidak dikonfigurasi. Tambahkan di environment variables.' },
        { status: 500 }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'instagram_caption') {
      systemPrompt = `Kamu adalah copywriter profesional untuk brand mobil premium "Strapped Indonesia" yang menjual custom plate frame (bingkai plat nomor kustom premium). 
Tulis caption Instagram yang menarik, engaging, dan sesuai tone brand. 
Gunakan bahasa ${language === 'en' ? 'Inggris' : 'Indonesia'} yang natural.
Sertakan emoji yang relevan tapi jangan berlebihan.
Tambahkan 5-10 hashtag relevan di akhir.
Tone: ${tone || 'premium, modern, automotive enthusiast'}.`;

      userPrompt = `Buatkan caption Instagram untuk konten berikut:
Mobil: ${mobil || 'tidak disebutkan'}
Konteks/Deskripsi: ${context || 'konten produk plate frame'}
${body.additional_info ? `Info tambahan: ${body.additional_info}` : ''}`;

    } else if (type === 'article') {
      systemPrompt = `Kamu adalah content writer profesional untuk brand "Strapped Indonesia" yang menjual custom plate frame premium. 
Tulis artikel yang informatif, SEO-friendly, dan engaging.
Gunakan bahasa ${language === 'en' ? 'Inggris' : 'Indonesia'}.
Format dengan heading, subheading, dan paragraf yang rapi.
Tone: ${tone || 'informatif, profesional, automotive enthusiast'}.`;

      userPrompt = `Buatkan artikel dengan topik berikut:
Topik: ${context || 'plate frame kustom'}
Mobil yang dibahas: ${mobil || 'umum'}
${body.word_count ? `Target kata: ${body.word_count}` : 'Target kata: 500-800'}
${body.additional_info ? `Info tambahan: ${body.additional_info}` : ''}`;

    } else {
      return NextResponse.json({ error: 'Invalid type. Use "instagram_caption" or "article".' }, { status: 400 });
    }

    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
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
      type,
      model: data.model,
      usage: data.usage,
    });
  } catch (err: any) {
    console.error('Copywriting AI error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
