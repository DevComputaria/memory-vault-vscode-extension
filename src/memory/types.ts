export type MemoryType =
  | 'build'
  | 'infra'
  | 'pipeline'
  | 'bug'
  | 'architecture'
  | 'decision'
  | 'file'
  | 'command';

export interface MemoryEntry {
  id: string;
  sessionId?: string;
  project: string;
  type: MemoryType;
  title?: string;
  content: string;
  tags: string[];
  filePath?: string;
  gitBranch?: string;
  createdAt: number;
  embedding?: Float32Array;
}

export interface StoreMemoryInput {
  sessionId?: string;
  project: string;
  type: MemoryType;
  title?: string;
  content: string;
  tags?: string[];
  filePath?: string;
  gitBranch?: string;
}

export interface RecoverContextOptions {
  project: string;
  currentSessionId?: string;
  currentBranch?: string;
  query?: string;
  maxItems?: number;
}

export interface RecoveredContext {
  all: MemoryEntry[];
  recent: MemoryEntry[];
  bugs: MemoryEntry[];
  branch: MemoryEntry[];
  session: MemoryEntry[];
}
