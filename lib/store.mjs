import fs from 'node:fs/promises';
import path from 'node:path';
import { decrypt, emptyStore, encrypt } from './crypto.mjs';

export class Store {
  constructor(file) { this.file = file; this.queue = Promise.resolve(); }
  async read() {
    try { return decrypt(await fs.readFile(this.file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return emptyStore(); throw error; }
  }
  async write(data) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(temp, encrypt({ ...data, updatedAt: new Date().toISOString() }), { mode: 0o600 });
    await fs.rename(temp, this.file);
  }
  update(change) {
    this.queue = this.queue.then(async () => {
      const current = await this.read();
      const next = await change(current);
      await this.write(next);
      return next;
    });
    return this.queue;
  }
}
