import * as vscode from 'vscode';
import { MemoryDatabase } from '../memory/database';
import { MemoryType } from '../memory/types';

function classifyTerminalOutput(text: string): { type: MemoryType; tags: string[] } {
  const value = text.toLowerCase();

  if (value.includes('dotnet build') || value.includes('dotnet publish') || value.includes('npm run build')) {
    return { type: 'build', tags: ['terminal', 'build'] };
  }
  if (value.includes('kubectl') || value.includes('helm') || value.includes('docker ') || value.includes('eks')) {
    return { type: 'infra', tags: ['terminal', 'infra', 'k8s'] };
  }
  if (
    value.includes('azure-pipelines') ||
    value.includes('az pipelines') ||
    value.includes('github actions') ||
    value.includes('gh workflow')
  ) {
    return { type: 'pipeline', tags: ['terminal', 'pipeline'] };
  }
  if (value.includes('error') || value.includes('exception') || value.includes('failed')) {
    return { type: 'bug', tags: ['terminal', 'error'] };
  }

  return { type: 'command', tags: ['terminal'] };
}

export function registerTerminalCapture(
  ctx: vscode.ExtensionContext,
  db: MemoryDatabase,
  getSessionId: () => string | undefined
): void {
  const enabled = vscode.workspace.getConfiguration('memoryVault').get<boolean>('captureTerminal', true);
  if (!enabled) {
    return;
  }

  const windowAny = vscode.window as any;

  if (typeof windowAny.onDidWriteTerminalData === 'function') {
    const disposable = windowAny.onDidWriteTerminalData(async (event: { data: string }) => {
      const text = event.data.trim();
      if (!text || text.length < 12 || text.length > 5000) {
        return;
      }

      const classification = classifyTerminalOutput(text);
      const project = vscode.workspace.name ?? 'unknown-project';

      await db.storeMemory({
        sessionId: getSessionId(),
        project,
        type: classification.type,
        title: 'Terminal capture',
        content: text,
        tags: classification.tags
      });
    });

    ctx.subscriptions.push(disposable);
    return;
  }

  if (typeof windowAny.onDidStartTerminalShellExecution === 'function') {
    const disposable = windowAny.onDidStartTerminalShellExecution(async (event: any) => {
      const text = String(event?.execution?.commandLine?.value ?? event?.execution?.commandLine ?? '').trim();
      if (!text || text.length < 2 || text.length > 3000) {
        return;
      }

      const classification = classifyTerminalOutput(text);
      const project = vscode.workspace.name ?? 'unknown-project';

      await db.storeMemory({
        sessionId: getSessionId(),
        project,
        type: classification.type,
        title: 'Terminal command',
        content: text,
        tags: [...classification.tags, 'shell-exec']
      });
    });

    ctx.subscriptions.push(disposable);
  }
}
