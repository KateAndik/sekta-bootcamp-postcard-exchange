import pg from 'pg';
import { decrypt, emptyStore, encrypt } from './crypto.mjs';

export class PostgresStore {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString, max: 5, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false });
    this.ready = this.pool.query(`
      CREATE TABLE IF NOT EXISTS postcard_app_state (
        id smallint PRIMARY KEY CHECK (id = 1),
        encrypted_payload text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    this.queue = Promise.resolve();
  }
  async read() {
    await this.ready;
    const result = await this.pool.query('SELECT encrypted_payload FROM postcard_app_state WHERE id = 1');
    return result.rowCount ? decrypt(result.rows[0].encrypted_payload) : emptyStore();
  }
  async write(data) {
    await this.ready;
    const payload = encrypt({ ...data, updatedAt: new Date().toISOString() });
    await this.pool.query(`
      INSERT INTO postcard_app_state (id, encrypted_payload) VALUES (1, $1)
      ON CONFLICT (id) DO UPDATE SET encrypted_payload = EXCLUDED.encrypted_payload, updated_at = now()
    `, [payload]);
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
