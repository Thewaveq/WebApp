export async function handleExportChat(activeSession, currentUser, marked, DOMPurify, showModalAlert) {

    if (!activeSession || !activeSession.messages || !activeSession.messages.length === 0) {
        showModalAlert('В этом чате нет сообщений для экспорта.');
        return;
    }

    // --- ШАГ 1: Асинхронно загружаем ваш файл со стилями ---
    let appStyles = '';
    try {
        const response = await fetch('./styles4.css'); // Загружаем файл
        if (!response.ok) {
            throw new Error(`Не удалось загрузить стили: ${response.statusText}`);
        }
        appStyles = await response.text(); // Получаем его содержимое как текст
    } catch (error) {
        console.error("Ошибка при загрузке styles4.css:", error);
        showModalAlert('Не удалось загрузить файл стилей. Экспорт будет без оформления.');
        // Мы не прерываем экспорт, просто он будет некрасивым
    }

    // --- ШАГ 2: Добавляем несколько специфичных стилей для макета самого документа ---
    const exportSpecificStyles = `
        body { padding: 1rem 2rem; }
        .container { max-width: 800px; margin: auto; }
        h1 { font-weight: 700; margin-bottom: 2rem; }
        /* Прячем элементы интерфейса, которые могут случайно отрендериться */
        #sidebar, #main-content, .modal-overlay, #sidebar-backdrop { display: none !important; }
    `;

    const chatTitle = activeSession.title || 'Экспорт чата';
    const messages = activeSession.messages;

    // --- ШАГ 3: Генерируем HTML для сообщений, используя классы из вашего CSS ---
    const messagesHtml = messages.map(msg => {
        const isUser = msg.role === 'user';
        // Используем ТОЧНО ТЕ ЖЕ классы, что и в вашем приложении
        const roleClass = isUser ? 'user-message-bg' : 'assistant-message-bg';
        
        const thinkRegex = /<think>[\s\S]*?<\/think>/g;
        const fileRegex = /<file name="([^"]+)">([\s\S]*)<\/file>/;
        let content = (msg.content || '').replace(thinkRegex, '').trim();

        const fileMatch = content.match(fileRegex);
        let contentHtml;

        if (fileMatch) {
            contentHtml = `<div class="prose"><p>Прикреплен файл: <strong>${DOMPurify.sanitize(fileMatch[1])}</strong></p></div>`;
        } else {
            // Оборачиваем отрендеренный markdown в .prose, как в вашем приложении
            contentHtml = `<div class="prose">${marked.parse(content, { breaks: true, gfm: true })}</div>`;
        }

        // Собираем сообщение. Обратите внимание, что структура и классы
        // (message-container, user-message-bg) взяты из вашего приложения.
        return `<div class="message-container ${roleClass}" style="padding: 1.5rem; border-radius: 0.75rem;">
                    ${contentHtml}
                </div>`;
    }).join('');

    // --- ШАГ 4: Собираем финальный HTML-документ ---
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
                /* --- Стили, загруженные из вашего файла styles4.css --- */
                ${appStyles}

                /* --- Дополнительные стили только для макета этого документа --- */
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

    // Создаем Blob и инициируем скачивание (этот код не изменился)
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
