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
    
    // Определяем, является ли запрос потоковым
    const isStreaming = payload.stream === true;

    // Делаем запрос к внешнему API
    const apiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Сообщаем API, что мы готовы принимать потоковый ответ
        'Accept': isStreaming ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Проверяем, был ли ответ от API успешным
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Error from target API [${apiResponse.status}]:`, errorText);
      return res.status(502).json({
        error: `Upstream API returned an error.`,
        details: {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          body: errorText,
        }
      });
    }

    // Если это потоковый запрос, передаем поток клиенту
    if (isStreaming) {
      // Устанавливаем заголовки для Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Получаем читаемый поток (ReadableStream) из ответа
      const reader = apiResponse.body.getReader();
      const decoder = new TextDecoder();

      // Функция для чтения и отправки чанков клиенту
      const push = async () => {
        const { done, value } = await reader.read();
        if (done) {
          res.end(); // Завершаем ответ, когда поток от API закончился
          return;
        }
        // Отправляем полученный чанк дальше на фронтенд
        res.write(decoder.decode(value));
        // Рекурсивно вызываем себя для чтения следующего чанка
        await push();
      };
      
      await push();

    } else {
      // Если это обычный запрос, ждем все данные и отправляем как JSON
      const data = await apiResponse.json();
      return res.status(200).json(data);
    }

  } catch (error) {
    console.error('Proxy Internal Error:', error);
    res.status(500).json({ error: 'An internal error occurred in the proxy.', details: error.message });
  }
}
