const PROXY_ENDPOINT = '/api/telegraph'; // Обращаемся к нашему прокси
const STORAGE_KEY = 'telegraph_access_token';

/**
 * Преобразует Markdown-подобную разметку в массив Node-объектов для API Telegraph.
 * @param {string} markdownText - Текст для преобразования.
 * @returns {Array} - Массив Node-объектов.
 */
function convertMarkdownToNodes(markdownText) {
    const nodes = [];
    const lines = (markdownText || '').split('\n');

    for (const line of lines) {
        // Пропускаем пустые строки, чтобы не создавать пустых <p>
        if (line.trim() === '') continue;

        const p = {
            tag: 'p',
            children: [line]
        };
        nodes.push(p);
    }
    // Если после обработки не осталось ни одного узла (например, текст состоял из пробелов),
    // возвращаем один пустой параграф, чтобы API Telegraph не вернул ошибку CONTENT_EMPTY.
    if (nodes.length === 0) {
        return [{ tag: 'p', children: [''] }];
    }
    return nodes;
}


/**
 * Получает access_token из localStorage или регистрирует нового анонимного пользователя через прокси.
 * @param {string} appName - Имя вашего приложения для short_name.
 * @param {string} authorName - Имя автора (может быть 'Anonymous').
 * @returns {Promise<string>} - Промис, который разрешается с access_token.
 */
async function getAccessToken(appName = 'MBOX', authorName = 'Anonymous') {
    let accessToken = localStorage.getItem(STORAGE_KEY);
    if (accessToken) {
        return accessToken;
    }

    const response = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'createAccount', // Указываем метод для прокси
            payload: {              // Данные для этого метода
                short_name: appName,
                author_name: authorName
            }
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
 * Создает страницу в Telegraph через прокси.
 * @param {string} title - Заголовок страницы.
 * @param {Array} contentNodes - Содержимое в виде массива Node-объектов.
 * @returns {Promise<string>} - Промис, который разрешается с URL созданной страницы.
 */
async function createTelegraphPage(title, contentNodes) {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(PROXY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: 'createPage', // Указываем метод для прокси
                payload: {            // Данные для этого метода
                    access_token: accessToken,
                    title: title,
                    content: contentNodes,
                    return_content: false
                }
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
        throw error;
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
        if (typeof msg.content !== 'string' || msg.content.startsWith('<file')) {
            return;
        }
        
        const author = msg.role === 'user' ? 'Вы' : (msg.modelName || 'Ассистент');
        allContent.push({ tag: 'h4', children: [author] });
        
        const messageNodes = convertMarkdownToNodes(msg.content);
        allContent.push(...messageNodes);
        
        allContent.push({ tag: 'hr' });
    });

    return createTelegraphPage(chatTitle, allContent);
}
