import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.PHONE_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('PHONE_ENCRYPTION_KEY environment variable is required');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptPhone(phone: string): Buffer {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

export function decryptPhone(encrypted: Buffer | Uint8Array): string {
  const buf = Buffer.isBuffer(encrypted) ? encrypted : Buffer.from(encrypted);
  const key = getKey();
  const iv = buf.subarray(0, IV_LENGTH);
  const data = buf.subarray(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return decipher.update(data) + decipher.final('utf8');
}

export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
