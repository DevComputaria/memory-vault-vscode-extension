import * as vscode from 'vscode';
import { MemoryDatabase } from '../memory/database';

async function currentBranch(): Promise<string | undefined> {
  try {
    const extension = vscode.extensions.getExtension('vscode.git');
    const gitApi = extension?.isActive ? (extension.exports as any)?.getAPI?.(1) : undefined;
    const repo = gitApi?.repositories?.[0];
    return repo?.state?.HEAD?.name;
  } catch {
    return undefined;
  }
}

export function registerGitCapture(
  ctx: vscode.ExtensionContext,
  db: MemoryDatabase,
  getSessionId: () => string | undefined
): void {
  const enabled = vscode.workspace.getConfiguration('memoryVault').get<boolean>('captureGit', true);
  if (!enabled) {
    return;
  }

  let lastBranch = '';

  const timer = setInterval(async () => {
    const project = vscode.workspace.name ?? 'unknown-project';
    const branch = await currentBranch();

    if (branch && branch !== lastBranch) {
      lastBranch = branch;
      await db.storeMemory({
        sessionId: getSessionId(),
        project,
        type: 'decision',
        title: 'Git branch changed',
        content: `Branch changed to ${branch}`,
        gitBranch: branch,
        tags: ['git', 'branch']
      });
    }
  }, 15000);

  ctx.subscriptions.push({ dispose: () => clearInterval(timer) });

  ctx.subscriptions.push(
    vscode.commands.registerCommand('memory.captureCommit', async () => {
      const project = vscode.workspace.name ?? 'unknown-project';
      const branch = await currentBranch();
      await db.storeMemory({
        sessionId: getSessionId(),
        project,
        type: 'decision',
        title: 'Manual commit capture',
        content: 'Commit or commit-intent captured manually.',
        gitBranch: branch,
        tags: ['git', 'commit']
      });
      vscode.window.showInformationMessage('Memory Vault: evento de commit registrado.');
    })
  );
}

export { currentBranch };
