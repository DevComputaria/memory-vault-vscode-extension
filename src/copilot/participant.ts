import * as vscode from 'vscode';
import { MemoryDatabase } from '../memory/database';
import { RetrievalService } from '../memory/retrieval';
import { ContextInjector } from './contextInjector';
import { currentBranch } from '../capture/git';

export function registerMemoryParticipant(
  ctx: vscode.ExtensionContext,
  db: MemoryDatabase,
  getSessionId: () => string | undefined
): void {
  const retrieval = new RetrievalService(db);
  const injector = new ContextInjector(db);

  const vscodeAny = vscode as any;
  const chatApi = vscodeAny.chat;

  if (!chatApi?.createChatParticipant) {
    ctx.subscriptions.push(
      vscode.commands.registerCommand('memory.chatFallback', () => {
        void vscode.window.showWarningMessage(
          'Memory Vault: API de Chat Participant não disponível nesta versão do VS Code.'
        );
      })
    );
    return;
  }

  const participant = chatApi.createChatParticipant(
    'memory',
    async (request: any, _chatContext: any, stream: any, _token: vscode.CancellationToken) => {
      const prompt = String(request?.prompt ?? '').trim();
      const project = vscode.workspace.name ?? 'unknown-project';
      const branch = await currentBranch();

      if (!prompt) {
        stream.markdown('Envie uma pergunta. Ex: `@memory o que aconteceu com o timeout do redis?`');
        return;
      }

      const result = await retrieval.search(project, prompt, 8);
      const contextBlock = injector.buildContextBlock(project, prompt, getSessionId(), branch);

      stream.markdown(`### 🧠 Memory Vault\n`);
      stream.markdown(`Pergunta: **${prompt}**\n\n`);

      if (!result.merged.length) {
        stream.markdown('Nenhuma memória relevante encontrada ainda.\n\n');
      } else {
        stream.markdown(`Encontradas **${result.merged.length}** memórias relevantes:\n\n`);
        for (const item of result.merged) {
          const scoreLabel = typeof (item as any).score === 'number' ? ` • ${(item as any).score.toFixed(2)}` : '';
          stream.markdown(
            `- **[${item.type.toUpperCase()}]** ${item.title ?? 'Sem título'}${scoreLabel}\n` +
              `  - ${item.content.slice(0, 220)}\n`
          );
        }
      }

      if (contextBlock) {
        stream.markdown('\n---\n');
        stream.markdown('#### Contexto consolidado para o Copilot\n');
        stream.markdown('```markdown\n' + contextBlock + '\n```');
      }
    }
  );

  ctx.subscriptions.push(participant);
}
