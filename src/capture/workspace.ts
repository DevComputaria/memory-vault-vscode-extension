import * as vscode from 'vscode';
import { MemoryDatabase } from '../memory/database';
import { MemoryType } from '../memory/types';

function classifyFile(relativePath: string, languageId: string): { type: MemoryType; tags: string[] } {
  const p = relativePath.toLowerCase();

  if (p.includes('docker') || p.includes('k8s') || p.includes('helm') || p.includes('terraform')) {
    return { type: 'infra', tags: ['workspace', languageId, 'infra'] };
  }
  if (p.includes('pipeline') || p.includes('.github/workflows') || p.includes('azure-pipelines')) {
    return { type: 'pipeline', tags: ['workspace', languageId, 'pipeline'] };
  }
  if (p.includes('architecture') || p.endsWith('.drawio') || p.endsWith('.puml') || p.endsWith('.bicep')) {
    return { type: 'architecture', tags: ['workspace', languageId, 'architecture'] };
  }

  return { type: 'file', tags: ['workspace', languageId] };
}

export function registerWorkspaceCapture(
  ctx: vscode.ExtensionContext,
  db: MemoryDatabase,
  getSessionId: () => string | undefined
): void {
  const enabled = vscode.workspace.getConfiguration('memoryVault').get<boolean>('captureWorkspace', true);
  if (!enabled) {
    return;
  }

  ctx.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const project = vscode.workspace.name ?? 'unknown-project';
      const relativePath = vscode.workspace.asRelativePath(doc.uri);
      const cls = classifyFile(relativePath, doc.languageId);

      await db.storeMemory({
        sessionId: getSessionId(),
        project,
        type: cls.type,
        title: `Saved ${relativePath}`,
        content: `File saved: ${relativePath} (${doc.languageId})`,
        filePath: relativePath,
        tags: cls.tags
      });
    })
  );

  ctx.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (!event.document.uri.fsPath || event.contentChanges.length === 0) {
        return;
      }

      const project = vscode.workspace.name ?? 'unknown-project';
      const relativePath = vscode.workspace.asRelativePath(event.document.uri);

      const changedChars = event.contentChanges.reduce((acc, c) => acc + c.text.length, 0);
      if (changedChars < 30) {
        return;
      }

      await db.storeMemory({
        sessionId: getSessionId(),
        project,
        type: 'file',
        title: `Edited ${relativePath}`,
        content: `File edited: ${relativePath} (+${changedChars} chars)` ,
        filePath: relativePath,
        tags: ['workspace', 'edit', event.document.languageId]
      });
    })
  );
}
