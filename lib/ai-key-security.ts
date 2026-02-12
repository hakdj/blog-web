import crypto from 'crypto';

export function maskApiKey(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET || process.env.CRON_SECRET || '';
  if (!secret) {
    throw new Error('AI_KEY_ENCRYPTION_SECRET is missing');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptApiKey(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptApiKey(payload?: string | null): string {
  const value = String(payload || '').trim();
  if (!value) return '';
  if (!value.startsWith('v1:')) return value;
  const [, ivB64, tagB64, encryptedB64] = value.split(':');
  if (!ivB64 || !tagB64 || !encryptedB64) return '';
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString('utf8');
}

