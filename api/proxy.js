// Файл: /api/proxy.js
// Исправленная и улучшенная версия прокси-сервера

export default async function handler(req, res) {
  // Разрешаем запросы только методом POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { targetUrl, apiKey, payload } = req.body;

    if (!targetUrl || !apiKey || !payload) {
      return res.status(400).json({ error: 'Missing targetUrl, apiKey, or payload in request body.' });
    }

    // Делаем запрос к внешнему API
    const apiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // **КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Проверяем, был ли ответ от API успешным**
    if (!apiResponse.ok) {
      // Если ответ неуспешный (статус 4xx или 5xx), пытаемся прочитать тело ответа как текст
      const errorText = await apiResponse.text();
      console.error(`Error from target API [${apiResponse.status}]:`, errorText);
      
      // Отправляем на фронтенд более информативную ошибку
      // Статус 502 (Bad Gateway) семантически корректен в данном случае
      return res.status(502).json({
        error: `Upstream API returned an error.`,
        details: {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          body: errorText, // Тело ответа, которое могло вызвать сбой
        }
      });
    }

    // Только если ответ был успешным (статус 2xx), парсим его как JSON
    const data = await apiResponse.json();

    // Отправляем успешный ответ от API обратно нашему фронтенду
    return res.status(200).json(data);

  } catch (error) {
    // Этот блок теперь будет ловить только настоящие сбои:
    // - Ошибки сети (например, не удалось разрешить DNS-имя targetUrl)
    // - Внутренние ошибки в самом коде прокси
    console.error('Proxy Internal Error:', error);
    res.status(500).json({ error: 'An internal error occurred in the proxy.', details: error.message });
  }
}
