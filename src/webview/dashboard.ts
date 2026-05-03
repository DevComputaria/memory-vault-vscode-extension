import * as vscode from 'vscode';
import { MemoryDatabase } from '../memory/database';

export function openDashboard(ctx: vscode.ExtensionContext, db: MemoryDatabase): void {
  const project = vscode.workspace.name ?? 'unknown-project';
  const stats = db.getProjectStats(project);
  const recent = db.listRecent(project, 50);

  const panel = vscode.window.createWebviewPanel(
    'memoryDashboard',
    'Copilot Memory Vault Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  const bootData = {
    project,
    stats,
    recent: recent.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title ?? '',
      content: m.content,
      tags: m.tags,
      createdAt: m.createdAt
    }))
  };

  const bootDataJson = JSON.stringify(bootData).replace(/</g, '\\u003c');

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Memory Vault Dashboard</title>
    <style>
      body { font-family: Inter, Segoe UI, Arial, sans-serif; margin: 0; padding: 0; background: #111827; color: #e5e7eb; }
      .wrap { padding: 18px; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
      .card { background: #1f2937; border: 1px solid #374151; border-radius: 10px; padding: 12px; }
      .title { font-size: 13px; color: #9ca3af; }
      .value { font-size: 26px; font-weight: 700; margin-top: 6px; }
      input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #374151; background: #0f172a; color: #fff; }
      .item { background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 10px; margin-top: 8px; }
      .tag { display:inline-block; border:1px solid #4b5563; border-radius:20px; padding:2px 8px; font-size:11px; margin-right:4px; color:#cbd5e1; }
      .meta { color:#9ca3af; font-size:12px; margin-top:4px; }
      .actions { margin: 12px 0; display: flex; gap: 8px; }
      button { background: #2563eb; color: #fff; border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
      button.secondary { background: #374151; }
    </style>
  </head>
  <body>
    <div id="root"></div>

    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script>
      const vscode = acquireVsCodeApi();
      const data = ${bootDataJson};
      const e = React.createElement;

      function App() {
        const [query, setQuery] = React.useState('');
        const [items, setItems] = React.useState(data.recent || []);

        const filtered = React.useMemo(() => {
          const q = query.toLowerCase().trim();
          if (!q) return items;
          return items.filter((i) =>
            (i.title || '').toLowerCase().includes(q) ||
            (i.content || '').toLowerCase().includes(q) ||
            (i.type || '').toLowerCase().includes(q)
          );
        }, [items, query]);

        return e('div', { className: 'wrap' },
          e('h2', null, '🧠 Memory Vault • ', data.project),
          e('div', { className: 'grid' },
            e('div', { className: 'card' }, e('div', { className: 'title' }, 'Total memórias'), e('div', { className: 'value' }, data.stats.total)),
            e('div', { className: 'card' }, e('div', { className: 'title' }, 'Com embeddings'), e('div', { className: 'value' }, data.stats.withEmbeddings)),
            e('div', { className: 'card' }, e('div', { className: 'title' }, 'Sessões'), e('div', { className: 'value' }, data.stats.sessions))
          ),
          e('div', { className: 'actions' },
            e('button', { onClick: () => vscode.postMessage({ command: 'exportMarkdown' }) }, 'Exportar Markdown'),
            e('button', { className: 'secondary', onClick: () => vscode.postMessage({ command: 'snapshot' }) }, 'Criar Snapshot')
          ),
          e('input', {
            placeholder: 'Filtrar memórias por texto, tipo, conteúdo...',
            value: query,
            onChange: (ev) => setQuery(ev.target.value)
          }),
          e('div', null,
            filtered.map((item) =>
              e('div', { className: 'item', key: item.id },
                e('strong', null, '[' + item.type.toUpperCase() + '] ' + (item.title || 'Sem título')),
                e('div', { style: { marginTop: '6px' } }, item.content),
                e('div', { className: 'meta' }, new Date(item.createdAt).toLocaleString()),
                e('div', { style: { marginTop: '6px' } }, (item.tags || []).map((t) => e('span', { className: 'tag', key: item.id + t }, t)))
              )
            )
          )
        );
      }

      ReactDOM.createRoot(document.getElementById('root')).render(e(App));
    </script>
  </body>
</html>`;

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message?.command === 'exportMarkdown') {
        const markdown = db.exportToMarkdown(project);
        await vscode.env.clipboard.writeText(markdown);
        void vscode.window.showInformationMessage('Memory Vault: markdown exportado para a área de transferência.');
      }

      if (message?.command === 'snapshot') {
        const file = db.createSnapshot(project);
        void vscode.window.showInformationMessage(`Memory Vault: snapshot criado em ${file}`);
      }
    },
    undefined,
    ctx.subscriptions
  );
}
