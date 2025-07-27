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
      return res.status(400).json({ error: 'Missing required parameters.' });
    }
    
    const isStreaming = payload.stream === true;

    const apiResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': isStreaming ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Error from target API [${apiResponse.status}]:`, errorText);
      return res.status(502).json({
        error: `Upstream API returned an error.`,
        details: { status: apiResponse.status, body: errorText }
      });
    }

    if (isStreaming) {
      // --- ПРАВИЛЬНЫЙ СПОСОБ РУЧНОЙ ПЕРЕДАЧИ ПОТОКА ---
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 1. Получаем читатель из веб-потока (ReadableStream)
      const reader = apiResponse.body.getReader();

      // 2. Создаем цикл, который будет читать и отправлять данные
      const pump = async () => {
        while (true) {
          try {
            // Читаем следующий чанк данных
            const { done, value } = await reader.read();
            
            // Если поток закончился, завершаем наш ответ
            if (done) {
              return res.end();
            }
            
            // Если данные есть, отправляем их клиенту
            res.write(value);

          } catch (error) {
            console.error("Ошибка при чтении потока:", error);
            res.end(); // Завершаем соединение в случае ошибки
            break;
          }
        }
      };
      
      await pump();

    } else {
      // Для обычных запросов все остается как было
      const data = await apiResponse.json();
      return res.status(200).json(data);
    }

  } catch (error) {
    console.error('Proxy Internal Error:', error);
    res.status(500).json({ error: 'An internal error occurred in the proxy.', details: error.message });
  }
}
