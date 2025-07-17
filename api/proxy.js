// Файл: /api/proxy.js
// Это наш новый, умный и динамический прокси-сервер

export default async function handler(req, res) {
  // Разрешаем запросы только методом POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Получаем "пакет" данных от нашего фронтенда
    const { targetUrl, apiKey, payload } = req.body;

    // Проверяем, что все необходимые данные пришли
    if (!targetUrl || !apiKey || !payload) {
      return res.status(400).json({ error: 'Missing targetUrl, apiKey, or payload in request body.' });
    }

    // Делаем реальный запрос к нужному API от имени нашего сервера
    const apiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload), // Используем данные, которые прислал фронтенд
    });

    // Получаем ответ от API
    const data = await apiResponse.json();
    
    // Если в ответе от API есть ошибка, отправляем ее дальше
    if (data.error) {
        return res.status(apiResponse.status).json(data);
    }

    // Отправляем успешный ответ от API обратно нашему фронтенду
    res.status(apiResponse.status).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'An internal error occurred in the proxy.' });
  }
}