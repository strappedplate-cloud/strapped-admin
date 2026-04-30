import { NextRequest, NextResponse } from 'next/server';

// Google Gemini API for generating Instagram captions and article text (FREE)
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, mobil, context, tone, language, image_base64, image_media_type } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi. Dapatkan API key GRATIS di aistudio.google.com/apikey lalu masukkan di .env.local' },
        { status: 500 }
      );
    }

    let prompt = '';

    if (type === 'instagram_caption') {
      prompt = `Kamu adalah copywriter profesional untuk brand mobil premium "Strapped Indonesia" yang menjual custom plate frame (bingkai plat nomor kustom premium).

Tulis caption Instagram yang menarik, engaging, dan sesuai tone brand.
Gunakan bahasa ${language === 'en' ? 'Inggris' : 'Indonesia'} yang natural.
Sertakan emoji yang relevan tapi jangan berlebihan.
Tambahkan 5-10 hashtag relevan di akhir.
Tone: ${tone || 'premium, modern, automotive enthusiast'}.

Buatkan caption Instagram untuk konten berikut:
Mobil: ${mobil || 'tidak disebutkan'}
Konteks/Deskripsi: ${context || 'konten produk plate frame'}
${body.additional_info ? `Info tambahan: ${body.additional_info}` : ''}
${image_base64 ? '\nSaya juga melampirkan foto produk/konten. Analisis foto tersebut dan gunakan detail visual dari foto untuk membuat caption yang lebih relevan dan deskriptif.' : ''}`;

    } else if (type === 'article') {
      prompt = `Kamu adalah content writer profesional untuk brand "Strapped Indonesia" yang menjual custom plate frame premium.

Tulis artikel yang informatif, SEO-friendly, dan engaging.
Gunakan bahasa ${language === 'en' ? 'Inggris' : 'Indonesia'}.
Format dengan heading, subheading, dan paragraf yang rapi.
Tone: ${tone || 'informatif, profesional, automotive enthusiast'}.

Buatkan artikel dengan topik berikut:
Topik: ${context || 'plate frame kustom'}
Mobil yang dibahas: ${mobil || 'umum'}
${body.word_count ? `Target kata: ${body.word_count}` : 'Target kata: 500-800'}
${body.additional_info ? `Info tambahan: ${body.additional_info}` : ''}
${image_base64 ? '\nSaya juga melampirkan foto referensi. Analisis foto tersebut dan gunakan detail visual dari foto untuk membuat artikel yang lebih relevan.' : ''}`;

    } else {
      return NextResponse.json({ error: 'Invalid type. Use "instagram_caption" or "article".' }, { status: 400 });
    }

    // Build request parts
    const parts: any[] = [];

    if (image_base64) {
      parts.push({
        inlineData: {
          mimeType: image_media_type || 'image/jpeg',
          data: image_base64,
        },
      });
    }

    parts.push({ text: prompt });

    const response = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
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
      type,
      model: 'gemini-2.0-flash',
    });
  } catch (err: any) {
    console.error('Copywriting AI error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
