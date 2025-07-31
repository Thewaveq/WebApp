const API_BASE_URL = 'https://api.telegra.ph/';
const STORAGE_KEY = 'telegraph_access_token';

function convertMarkdownToNodes(markdownText) {
    const nodes = [];
    const lines = markdownText.split('\n');

    for (const line of lines) {
        if (line.trim() === '') continue;

        // Пока простой обработчик: каждая строка - новый параграф.
        // Для более сложной разметки (списки, цитаты) потребуется более сложный парсер.
        const p = {
            tag: 'p',
            children: [line] // Упрощенно, вложенные теги можно будет добавить позже
        };
        nodes.push(p);
    }
    return nodes;
}


/**
 * Получает access_token из localStorage или регистрирует нового анонимного пользователя.
 * @param {string} appName - Имя вашего приложения для short_name.
 * @param {string} authorName - Имя автора (может быть 'Anonymous').
 * @returns {Promise<string>} - Промис, который разрешается с access_token.
 */
async function getAccessToken(appName = 'MBOX', authorName = 'Anonymous') {
    let accessToken = localStorage.getItem(STORAGE_KEY);
    if (accessToken) {
        return accessToken;
    }

    const response = await fetch(`${API_BASE_URL}createAccount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            short_name: appName,
            author_name: authorName
        })
    });

    const data = await response.json();

    if (data.ok) {
        accessToken = data.result.access_token;
        localStorage.setItem(STORAGE_KEY, accessToken);
        return accessToken;
    } else {
        throw new Error(data.error || 'Не удалось создать аккаунт в Telegraph.');
    }
}

/**
 * Создает страницу в Telegraph.
 * @param {string} title - Заголовок страницы.
 * @param {Array} contentNodes - Содержимое в виде массива Node-объектов.
 * @returns {Promise<string>} - Промис, который разрешается с URL созданной страницы.
 */
async function createTelegraphPage(title, contentNodes) {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${API_BASE_URL}createPage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: accessToken,
                title: title,
                content: contentNodes,
                return_content: false
            })
        });

        const data = await response.json();

        if (data.ok) {
            return data.result.url;
        } else {
            throw new Error(data.error || 'Не удалось создать страницу в Telegraph.');
        }

    } catch (error) {
        console.error('Ошибка экспорта в Telegraph:', error);
        throw error; // Пробрасываем ошибку дальше для обработки в UI
    }
}

/**
 * Экспортирует одно сообщение в Telegraph.
 * @param {object} message - Объект сообщения { role, content, modelName }.
 * @returns {Promise<string>} - URL созданной страницы.
 */
export async function exportMessageToTelegraph(message) {
    const title = `Сообщение от ${message.role === 'user' ? 'Пользователя' : message.modelName || 'Ассистента'}`;
    const contentNodes = convertMarkdownToNodes(message.content);
    return createTelegraphPage(title, contentNodes);
}

/**
 * Экспортирует всю историю чата в Telegraph.
 * @param {string} chatTitle - Название чата.
 * @param {Array<object>} messages - Массив сообщений.
 * @returns {Promise<string>} - URL созданной страницы.
 */
export async function exportChatToTelegraph(chatTitle, messages) {
    const allContent = [];

    messages.forEach(msg => {
        // Пропускаем сообщения с файлами для чистоты экспорта
        if (typeof msg.content === 'string' && msg.content.startsWith('<file')) {
            return;
        }

        // Добавляем заголовок для каждого сообщения
        const author = msg.role === 'user' ? 'Вы' : (msg.modelName || 'Ассистент');
        allContent.push({ tag: 'h4', children: [author] });

        // Добавляем основной контент сообщения
        const messageNodes = convertMarkdownToNodes(msg.content);
        allContent.push(...messageNodes);

        // Добавляем разделитель
        allContent.push({ tag: 'hr' });
    });

    return createTelegraphPage(chatTitle, allContent);
}
