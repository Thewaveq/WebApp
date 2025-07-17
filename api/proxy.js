// Файл: /api/proxy.js
// Исправленная и улучшенная версия прокси-сервера

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { targetUrl, apiKey, payload } = req.body;

    if (!targetUrl || !apiKey || !payload) {
      return res.status(400).json({ error: 'Missing targetUrl, apiKey, or payload in request body.' });
    }

    // Сохраняем форматирование текста
    const apiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Ключевое исправление - сохраняем исходное форматирование
    const responseText = await apiResponse.text();

    if (!apiResponse.ok) {
      console.error(`Error from target API [${apiResponse.status}]:`, responseText);
      return res.status(502).json({
        error: `Upstream API returned an error.`,
        details: {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          body: responseText,
        }
      });
    }

    // Парсим ответ как текст, а не JSON
    return res.status(200).json(JSON.parse(responseText));

  } catch (error) {
    console.error('Proxy Internal Error:', error);
    res.status(500).json({ error: 'An internal error occurred in the proxy.', details: error.message });
  }
}
