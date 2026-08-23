import crypto from 'node:crypto';

function keyFromEnv() {
  const raw = process.env.DATA_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new Error('DATA_ENCRYPTION_KEY must contain 64 hex characters');
  return Buffer.from(raw, 'hex');
}

export function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromEnv(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), value: encrypted.toString('base64') });
}

export function decrypt(raw) {
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromEnv(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.value, 'base64')), decipher.final()]).toString('utf8'));
}

export const emptyStore = () => ({ version: 1, applications: [], assignments: [], routes: {}, updatedAt: new Date().toISOString() });
