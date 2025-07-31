export function handleExportChat(activeSession, currentUser, marked, DOMPurify, showModalAlert) {

    if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
        showModalAlert('В этом чате нет сообщений для экспорта.');
        return;
    }

    const chatTitle = activeSession.title || 'Экспорт чата';
    const messages = activeSession.messages;

    const styles = `
        :root {
            --bg-main: #18181b;
            --bg-user-msg: #27272a;
            --bg-assistant-msg: #1a222f;
            --bg-code: #282c34;
            --border-color: #3f3f46;
            --text-primary: #e4e4e7;
            --text-secondary: #a1a1aa;
            --accent-color: #409eff;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-main);
            color: var(--text-primary);
            margin: 0;
            padding: 1rem 2rem;
            line-height: 1.6;
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
        }
        .message {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            padding: 1rem;
            border-radius: 12px;
            max-width: 90%;
            box-sizing: border-box;
        }
        .message.user {
            background-color: var(--bg-user-msg);
            margin-left: auto;
        }
        .message.assistant {
            background-color: var(--bg-assistant-msg);
            margin-right: auto;
        }
        .message-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            flex-shrink: 0;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .avatar.assistant-avatar {
            background-color: var(--accent-color);
        }
        .role-name {
            font-weight: 500;
            font-size: 0.9em;
            color: var(--text-secondary);
        }
        .prose {
            max-width: none;
            font-size: 1rem;
        }
        .prose > *:first-child { margin-top: 0; }
        .prose > *:last-child { margin-bottom: 0; }
        .prose p { margin: 0 0 1em 0; }
        .prose ul, .prose ol { padding-left: 1.5em; }
        .prose pre {
            background-color: var(--bg-code);
            padding: 1em;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.9em;
        }
        .prose code {
            font-family: 'Courier New', Courier, monospace;
            color: #abb2bf;
        }
        .prose :not(pre) > code {
            background-color: var(--bg-code);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-size: 0.85em;
        }
        .file-attachment {
            border: 1px dashed var(--border-color);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            background-color: #333;
            font-family: monospace;
            font-size: 0.9em;
        }
    `;

    const messagesHtml = messages.map(msg => {
        const isUser = msg.role === 'user';
        const roleClass = isUser ? 'user' : 'assistant';
        const thinkRegex = /<think>[\s\S]*?<\/think>/g;
        const fileRegex = /<file name="([^"]+)">([\s\S]*)<\/file>/;
        let content = (msg.content || '').replace(thinkRegex, '').trim();
        let avatarHtml = '';
        let roleName = 'Ассистент';
        if (isUser) {
            const avatarSrc = currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'U')}&background=4285F4&color=fff`;
            avatarHtml = `<div class="avatar user-avatar"><img src="${avatarSrc}" alt="User Avatar"></div>`;
            roleName = currentUser?.displayName || 'Вы';
        } else {
            avatarHtml = `<div class="avatar assistant-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 4.2-4.3.4 3.3 2.9-.9 4.2 3.8-2.2 3.8 2.2-.9-4.2 3.3-2.9-4.3-.4L12 3z"/></svg>
                        </div>`;
            roleName = msg.modelName || 'Ассистент';
        }
        const fileMatch = content.match(fileRegex);
        let contentHtml;
        if (fileMatch) {
            contentHtml = `<div class="file-attachment">Прикреплен файл: <strong>${DOMPurify.sanitize(fileMatch[1])}</strong></div>`;
        } else {
            contentHtml = `<div class="prose">${marked.parse(content, { breaks: true, gfm: true })}</div>`;
        }
        return `<div class="message ${roleClass}">
                    <div class="message-header">
                        ${avatarHtml}
                        <span class="role-name">${DOMPurify.sanitize(roleName)}</span>
                    </div>
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
            <style>${styles}</style>
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
