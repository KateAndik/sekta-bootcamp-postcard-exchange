import path from 'node:path';
import { PostgresStore } from './postgres-store.mjs';
import { Store } from './store.mjs';

export function createStore(root) {
  return process.env.DATABASE_URL
    ? new PostgresStore(process.env.DATABASE_URL)
    : new Store(path.join(root, 'data', 'store.json'));
}
