import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  MemoryEntry,
  RecoverContextOptions,
  RecoveredContext,
  StoreMemoryInput
} from './types';
import { EmbeddingGenerator } from './embeddings';
import { applyPrivacyRules, scanForSecrets } from '../security';
import { OptimizedCosine } from '../semantic/optimizedCosine';

function toEmbeddingBuffer(values: Float32Array): Buffer {
  return Buffer.from(values.buffer.slice(values.byteOffset, values.byteOffset + values.byteLength));
}

function fromEmbeddingBuffer(buffer: Buffer | null): Float32Array | undefined {
  if (!buffer) {
    return undefined;
  }
  return new Float32Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 4));
}

export class MemoryDatabase {
  private readonly db: Database.Database;
  private readonly embedder: EmbeddingGenerator;
  private readonly cosine = new OptimizedCosine();

  constructor(private readonly storagePath: string) {
    fs.mkdirSync(storagePath, { recursive: true });
    const dbPath = path.join(storagePath, 'memory.db');
    this.db = new Database(dbPath);
    this.embedder = new EmbeddingGenerator();
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        branch TEXT,
        created_at INTEGER NOT NULL,
        ended_at INTEGER,
        summary TEXT
      );

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        project TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        file_path TEXT,
        git_branch TEXT,
        created_at INTEGER NOT NULL,
        embedding BLOB,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_memories_project_created ON memories(project, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_branch ON memories(git_branch);
    `);
  }

  createSession(project: string, branch?: string): string {
    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    this.db
      .prepare(`INSERT INTO sessions(id, project, branch, created_at) VALUES (?, ?, ?, ?)`)
      .run(id, project, branch ?? null, now);

    return id;
  }

  endSession(sessionId: string, summary?: string): void {
    this.db
      .prepare(`UPDATE sessions SET ended_at = ?, summary = ? WHERE id = ?`)
      .run(Date.now(), summary ?? null, sessionId);
  }

  async storeMemory(input: StoreMemoryInput): Promise<MemoryEntry | null> {
    const raw = applyPrivacyRules(input.content);
    if (!raw.trim()) {
      return null;
    }

    if (scanForSecrets(raw)) {
      return null;
    }

    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const tags = input.tags ?? [];

    const embedding = await this.embedder.generate(`${input.type} ${raw}`);

    this.db
      .prepare(
        `
        INSERT INTO memories(
          id, session_id, project, type, title, content, tags, file_path, git_branch, created_at, embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        input.sessionId ?? null,
        input.project,
        input.type,
        input.title ?? null,
        raw,
        JSON.stringify(tags),
        input.filePath ?? null,
        input.gitBranch ?? null,
        now,
        toEmbeddingBuffer(embedding)
      );

    return {
      id,
      sessionId: input.sessionId,
      project: input.project,
      type: input.type,
      title: input.title,
      content: raw,
      tags,
      filePath: input.filePath,
      gitBranch: input.gitBranch,
      createdAt: now,
      embedding
    };
  }

  recoverContext(options: RecoverContextOptions): RecoveredContext {
    const maxItems = options.maxItems ?? 12;

    const all = this.listRecent(options.project, maxItems);
    const recent = this.db
      .prepare(`SELECT * FROM memories WHERE project = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?`)
      .all(options.project, Date.now() - 24 * 60 * 60 * 1000, Math.min(8, maxItems))
      .map((row: any) => this.mapRow(row));

    const bugs = this.db
      .prepare(`SELECT * FROM memories WHERE project = ? AND type = 'bug' ORDER BY created_at DESC LIMIT 6`)
      .all(options.project)
      .map((row: any) => this.mapRow(row));

    const branch = options.currentBranch
      ? this.db
          .prepare(
            `SELECT * FROM memories WHERE project = ? AND git_branch = ? ORDER BY created_at DESC LIMIT ?`
          )
          .all(options.project, options.currentBranch, 6)
          .map((row: any) => this.mapRow(row))
      : [];

    const session = options.currentSessionId
      ? this.db
          .prepare(`SELECT * FROM memories WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`)
          .all(options.currentSessionId, 6)
          .map((row: any) => this.mapRow(row))
      : [];

    return { all, recent, bugs, branch, session };
  }

  listRecent(project: string, limit = 20): MemoryEntry[] {
    return this.db
      .prepare(`SELECT * FROM memories WHERE project = ? ORDER BY created_at DESC LIMIT ?`)
      .all(project, limit)
      .map((row: any) => this.mapRow(row));
  }

  lexicalSearch(project: string, query: string, limit = 10): MemoryEntry[] {
    const pattern = `%${query}%`;
    return this.db
      .prepare(
        `
        SELECT *
        FROM memories
        WHERE project = ?
          AND (content LIKE ? OR title LIKE ?)
        ORDER BY created_at DESC
        LIMIT ?
      `
      )
      .all(project, pattern, pattern, limit)
      .map((row: any) => this.mapRow(row));
  }

  async semanticSearch(
    project: string,
    query: string,
    limit = 6,
    threshold = 0.55
  ): Promise<Array<MemoryEntry & { score: number }>> {
    const queryEmbedding = await this.embedder.generate(query);

    const candidates = this.db
      .prepare(
        `
        SELECT * FROM memories
        WHERE project = ?
          AND embedding IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 300
      `
      )
      .all(project)
      .map((row: any) => this.mapRow(row));

    const scored = candidates
      .filter((entry: MemoryEntry) => entry.embedding)
      .map((entry: MemoryEntry) => ({
        ...entry,
        score: this.cosine.dotProduct(queryEmbedding, entry.embedding!)
      }))
      .filter((entry: MemoryEntry & { score: number }) => entry.score >= threshold)
      .sort(
        (a: MemoryEntry & { score: number }, b: MemoryEntry & { score: number }) =>
          b.score - a.score
      )
      .slice(0, limit);

    return scored;
  }

  getProjectStats(project: string): { total: number; withEmbeddings: number; sessions: number } {
    const total = this.db.prepare(`SELECT COUNT(*) as c FROM memories WHERE project = ?`).get(project) as {
      c: number;
    };
    const withEmbeddings = this.db
      .prepare(`SELECT COUNT(*) as c FROM memories WHERE project = ? AND embedding IS NOT NULL`)
      .get(project) as { c: number };
    const sessions = this.db.prepare(`SELECT COUNT(*) as c FROM sessions WHERE project = ?`).get(project) as {
      c: number;
    };

    return { total: total.c, withEmbeddings: withEmbeddings.c, sessions: sessions.c };
  }

  exportToMarkdown(project: string): string {
    const memories = this.listRecent(project, 200);
    const lines: string[] = [`# Memory Export - ${project}`, ``, `Generated: ${new Date().toISOString()}`, ``];

    for (const mem of memories) {
      lines.push(`## [${mem.type.toUpperCase()}] ${mem.title ?? mem.id}`);
      lines.push(`- Date: ${new Date(mem.createdAt).toISOString()}`);
      lines.push(`- Tags: ${mem.tags.join(', ') || 'none'}`);
      if (mem.filePath) {
        lines.push(`- File: ${mem.filePath}`);
      }
      if (mem.gitBranch) {
        lines.push(`- Branch: ${mem.gitBranch}`);
      }
      lines.push('');
      lines.push(mem.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  createSnapshot(project: string): string {
    const fileName = `memory-snapshot-${project}-${Date.now()}.md`;
    const filePath = path.join(this.storagePath, fileName);
    fs.writeFileSync(filePath, this.exportToMarkdown(project), 'utf8');
    return filePath;
  }

  close(): void {
    this.db.close();
  }

  private mapRow(row: any): MemoryEntry {
    return {
      id: row.id,
      sessionId: row.session_id ?? undefined,
      project: row.project,
      type: row.type,
      title: row.title ?? undefined,
      content: row.content,
      tags: JSON.parse(row.tags || '[]'),
      filePath: row.file_path ?? undefined,
      gitBranch: row.git_branch ?? undefined,
      createdAt: row.created_at,
      embedding: fromEmbeddingBuffer(row.embedding ?? null)
    };
  }
}
