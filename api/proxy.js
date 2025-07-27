// Файл: /api/proxy.js
// ФИНАЛЬНАЯ ВЕРСИЯ ДЛЯ EDGE RUNTIME - ГАРАНТИРОВАННЫЙ СТРИМИНГ

// Эта конфигурация ОБЯЗАТЕЛЬНА. Она указывает Vercel/Netlify
// запускать эту функцию в специальной среде для стриминга.
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // В Edge-среде мы работаем с стандартными объектами Request и Response.
  
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // Получаем тело запроса
    const { targetUrl, apiKey, payload } = await req.json();

    if (!targetUrl || !apiKey || !payload) {
      return new Response(JSON.stringify({ error: 'Missing required parameters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isStreaming = payload.stream === true;

    // Делаем запрос к внешнему API
    const apiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': isStreaming ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Если у внешнего API ошибка, сообщаем об этом
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Error from target API [${apiResponse.status}]:`, errorText);
      return new Response(JSON.stringify({
        error: `Upstream API returned an error.`,
        details: { status: apiResponse.status, body: errorText }
      }), {
        status: 502, // Bad Gateway
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- ГЛАВНОЕ ИЗМЕНЕНИЕ ---
    // Мы не читаем поток вручную. Мы просто берем ReadableStream 
    // из ответа API и передаем его напрямую в конструктор нашего ответа.
    // Платформа (Vercel/Netlify) сама позаботится о том, чтобы передать
    // его клиенту по частям без буферизации.
    
    // Копируем заголовки из ответа API в наш ответ (важно для Content-Type)
    const headers = new Headers(apiResponse.headers);
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: headers,
    });

  } catch (error) {
    console.error('Proxy Internal Error:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred in the proxy.', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
