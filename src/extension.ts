import * as vscode from 'vscode';
import { MemoryDatabase } from './memory/database';
import { registerTerminalCapture } from './capture/terminal';
import { registerWorkspaceCapture } from './capture/workspace';
import { registerGitCapture, currentBranch } from './capture/git';
import { registerMemoryParticipant } from './copilot/participant';
import { openDashboard } from './webview';

let db: MemoryDatabase | undefined;
let sessionId: string | undefined;

function getSessionId(): string | undefined {
  return sessionId;
}

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  const storagePath = ctx.globalStorageUri.fsPath;
  db = new MemoryDatabase(storagePath);

  const project = vscode.workspace.name ?? 'unknown-project';
  const branch = await currentBranch();
  sessionId = db.createSession(project, branch);

  registerTerminalCapture(ctx, db, getSessionId);
  registerWorkspaceCapture(ctx, db, getSessionId);
  registerGitCapture(ctx, db, getSessionId);
  registerMemoryParticipant(ctx, db, getSessionId);

  ctx.subscriptions.push(
    vscode.commands.registerCommand('memory.openDashboard', () => {
      if (!db) {
        return;
      }
      openDashboard(ctx, db);
    })
  );

  ctx.subscriptions.push(
    vscode.commands.registerCommand('memory.indexWorkspace', async () => {
      if (!db) {
        return;
      }

      const projectName = vscode.workspace.name ?? 'unknown-project';
      const files = await vscode.workspace.findFiles('**/*', '**/{node_modules,.git,out,dist,bin,obj}/**', 200);

      let captured = 0;
      for (const file of files) {
        const relativePath = vscode.workspace.asRelativePath(file);
        await db.storeMemory({
          sessionId,
          project: projectName,
          type: 'architecture',
          title: 'Workspace indexing',
          content: `Indexed file: ${relativePath}`,
          filePath: relativePath,
          tags: ['index', 'workspace']
        });
        captured++;
      }

      void vscode.window.showInformationMessage(`Memory Vault: indexação concluída (${captured} arquivos).`);
    })
  );

  void vscode.window.showInformationMessage('Copilot Memory Vault ativo. Use @memory no chat.');

  ctx.subscriptions.push({
    dispose() {
      if (db && sessionId) {
        db.endSession(sessionId, 'Session closed with extension deactivation');
      }
      db?.close();
      db = undefined;
    }
  });
}

export function deactivate(): void {
  db?.close();
  db = undefined;
}
