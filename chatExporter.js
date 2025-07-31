export function handleExportChat(activeSession, currentUser, marked, DOMPurify, showModalAlert) {

    if (!activeSession || !activeSession.messages || !activeSession.messages.length === 0) {
        showModalAlert('В этом чате нет сообщений для экспорта.');
        return;
    }

    // --- СТИЛИ, ВСТРОЕННЫЕ НАПРЯМУЮ В СКРИПТ (НАДЕЖНЫЙ МЕТОД) ---
    // Здесь только то, что нужно для отображения сообщений и кода.
    const styles = `
        :root {
            /* Основные цвета из вашего файла styles4.css */
            --bg-main: #18181b;
            --bg-sidebar: #1a222f; /* Фон сообщений ассистента */
            --bg-element: #27272a; /* Фон сообщений пользователя */
            --bg-code: rgba(0, 0, 0, 0.4);
            --border-color: #3f3f46;
            --text-primary: #f5f5f5;
            --text-secondary: #888888;
            --accent-hover: #57a5f8;
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-main);
            color: var(--text-primary);
            margin: 0;
            padding: 1rem 2rem;
        }
        .container {
            max-width: 800px;
            margin: auto;
        }
        h1 {
            color: #fff;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
            font-weight: 700;
            margin-bottom: 2rem;
        }
        .message-bubble {
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-bottom: 1rem;
            max-width: 90%;
            box-sizing: border-box;
            word-wrap: break-word;
            line-height: 1.6;
        }
        .message-bubble.user {
            background-color: var(--bg-element);
            margin-left: auto; /* Сообщение пользователя справа */
        }
        .message-bubble.assistant {
            background-color: var(--bg-sidebar);
            margin-right: auto; /* Сообщение ассистента слева */
        }
        
        /* Стили для контента внутри сообщений (Markdown) */
        .prose { 
            color: var(--text-primary);
            white-space: pre-wrap;
        }
        .prose p { margin: 0; }
        .prose pre {
            background-color: var(--bg-code);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 1em;
            border-radius: 0.75rem;
            white-space: pre;
            overflow-x: auto;
            font-size: 0.9em;
        }
        .prose code {
            font-family: ui-monospace, Menlo, Monaco, "Courier New", monospace;
            font-size: 0.85em;
        }
        .prose :not(pre) > code {
            background-color: rgba(14, 99, 156, 0.15);
            color: var(--accent-hover);
            border: 1px solid rgba(14, 99, 156, 0.3);
            padding: 0.1rem 0.8rem;
            border-radius: 0.3rem;
        }
    `;

    const chatTitle = activeSession.title || 'Экспорт чата';
    const messages = activeSession.messages;

    // --- ГЕНЕРАЦИЯ HTML ДЛЯ СООБЩЕНИЙ (БЕЗ АВАТАРА И ИМЕНИ) ---
    const messagesHtml = messages.map(msg => {
        const isUser = msg.role === 'user';
        const roleClass = isUser ? 'user' : 'assistant';
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

        // Упрощенная структура, без заголовков и аватаров
        return `<div class="message-bubble ${roleClass}">
                    ${contentHtml}
                </div>`;
    }).join('');

    // Собираем финальный HTML-документ
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
                ${styles}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${DOMPurify.sanitize(chatTitle)}</h1>
                ${messagesHtml}
            </div>
        </body>
        </html>`;

    // Создаем Blob и инициируем скачивание
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
