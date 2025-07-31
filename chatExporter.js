export async function handleExportChat(activeSession, currentUser, marked, DOMPurify, showModalAlert) {

    if (!activeSession || !activeSession.messages || !activeSession.messages.length === 0) {
        showModalAlert('В этом чате нет сообщений для экспорта.');
        return;
    }

    // --- УЛУЧШЕННЫЙ МЕТОД ЗАГРУЗКИ СТИЛЕЙ ---
    let appStyles = '';
    try {
        // 1. Находим на странице тег <link>, который подключает ваши стили.
        // Мы ищем тег link, у которого есть атрибут rel="stylesheet" и href которого заканчивается на .css
        const stylesheetLink = document.querySelector('link[rel="stylesheet"][href$=".css"]');

        if (!stylesheetLink) {
            // Если по какой-то причине тег не найден, сообщаем об этом.
            throw new Error('Тег <link rel="stylesheet"> не найден на странице.');
        }

        // 2. Используем его АБСОЛЮТНЫЙ путь (свойство .href), который всегда правильный.
        const response = await fetch(stylesheetLink.href);
        if (!response.ok) {
            throw new Error(`HTTP-ошибка: ${response.status} ${response.statusText}`);
        }
        appStyles = await response.text();

    } catch (error) {
        console.error("Ошибка при загрузке файла стилей:", error);
        // Теперь сообщение будет более информативным
        showModalAlert(`Не удалось загрузить файл стилей. Ошибка: ${error.message}. Экспорт будет без оформления.`);
    }

    // --- Код ниже остался без изменений ---

    const exportSpecificStyles = `
        body { padding: 1rem 2rem; }
        .container { max-width: 800px; margin: auto; }
        h1 { font-weight: 700; margin-bottom: 2rem; }
        #sidebar, #main-content, .modal-overlay, #sidebar-backdrop { display: none !important; }
    `;

    const chatTitle = activeSession.title || 'Экспорт чата';
    const messages = activeSession.messages;

    const messagesHtml = messages.map(msg => {
        const isUser = msg.role === 'user';
        const roleClass = isUser ? 'user-message-bg' : 'assistant-message-bg';
        const thinkRegex = /<think>[\s\S]*?<\/think>/g;
        const fileRegex = /<file name="([^"]+)">([\s\S]*)<\/file>/;
        let content = (msg.content || '').replace(thinkRegex, '').trim();
        const fileMatch = content.match(fileRegex);
        let contentHtml;
        if (fileMatch) {
            contentHtml = `<div class="prose"><p>Прикреплен файл: <strong>${DOMPurify.sanitize(fileMatch[1])}</strong></p></div>`;
        } else {
            contentHtml = `<div class="prose">${marked.parse(content, { breaks: true, gfm: true })}</div>`;
        }
        return `<div class="message-container ${roleClass}" style="padding: 1.5rem; border-radius: 0.75rem; max-width: 100% !important;">
                    ${contentHtml}
                </div>`;
    }).join('');

    const fullHtml = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <title>${DOMPurify.sanitize(chatTitle)}</title>
            <style>
                ${appStyles}
                ${exportSpecificStyles}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${DOMPurify.sanitize(chatTitle)}</h1>
                ${messagesHtml}
            </div>
        </body>
        </html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeFileName = chatTitle.replace(/[^a-z0-9а-яё\\s-]/gi, '_').replace(/\\s+/g, '-');
    link.download = `${safeFileName}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
