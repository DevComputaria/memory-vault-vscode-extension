import { MemoryDatabase } from '../memory/database';

export class ContextInjector {
  constructor(private readonly db: MemoryDatabase) {}

  buildContextBlock(project: string, query?: string, sessionId?: string, branch?: string): string {
    const ctx = this.db.recoverContext({
      project,
      query,
      currentSessionId: sessionId,
      currentBranch: branch,
      maxItems: 12
    });

    if (ctx.all.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('## [MEMORY VAULT CONTEXT]');
    lines.push(`Project: ${project}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    if (ctx.bugs.length) {
      lines.push('### Open/Past Bugs');
      for (const item of ctx.bugs.slice(0, 4)) {
        lines.push(`- ${item.content}`);
      }
      lines.push('');
    }

    if (ctx.branch.length) {
      lines.push('### Current Branch History');
      for (const item of ctx.branch.slice(0, 4)) {
        lines.push(`- [${item.type}] ${item.content.slice(0, 160)}`);
      }
      lines.push('');
    }

    if (ctx.recent.length) {
      lines.push('### Last 24h');
      for (const item of ctx.recent.slice(0, 4)) {
        lines.push(`- [${item.type}] ${item.content.slice(0, 160)}`);
      }
      lines.push('');
    }

    if (ctx.session.length) {
      lines.push('### Current Session');
      for (const item of ctx.session.slice(0, 4)) {
        lines.push(`- [${item.type}] ${item.content.slice(0, 160)}`);
      }
      lines.push('');
    }

    lines.push('[/MEMORY VAULT CONTEXT]');
    return lines.join('\n');
  }
}
