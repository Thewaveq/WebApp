export default async function handler(req, res) {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const { method, payload } = req.body;

        // Проверяем, что необходимые данные переданы
        if (!method || !payload) {
            return res.status(400).json({ error: 'Missing method or payload in request body' });
        }

        const telegraphApiUrl = `https://api.telegra.ph/${method}`;

        // Отправляем запрос с нашего сервера на сервер Telegraph
        const apiResponse = await fetch(telegraphApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await apiResponse.json();

        // Если Telegraph вернул ошибку, пересылаем ее клиенту
        if (!apiResponse.ok || !data.ok) {
            return res.status(apiResponse.status).json(data);
        }

        // Если все успешно, пересылаем успешный ответ клиенту
        res.status(200).json(data);

    } catch (error) {
        console.error('Telegraph proxy error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
