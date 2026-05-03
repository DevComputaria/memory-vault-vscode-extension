import { MemoryDatabase } from './database';
import { StoreMemoryInput } from './types';

export class MemoryStore {
  constructor(private readonly db: MemoryDatabase) {}

  async add(input: StoreMemoryInput): Promise<void> {
    await this.db.storeMemory(input);
  }
}
