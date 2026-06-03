import { describe, it, expect, beforeAll } from 'vitest';

// Set the encryption key before importing the module
beforeAll(() => {
  process.env.PHONE_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
});

describe('encryptPhone / decryptPhone', () => {
  it('should round-trip: encrypt then decrypt', async () => {
    const { encryptPhone, decryptPhone } = await import('../../utils/crypto.js');
    const phone = '13812345678';
    const encrypted = encryptPhone(phone);
    const decrypted = decryptPhone(encrypted);
    expect(decrypted).toBe(phone);
  });

  it('should produce different ciphertexts for same phone (random IV)', async () => {
    const { encryptPhone } = await import('../../utils/crypto.js');
    const enc1 = encryptPhone('13812345678');
    const enc2 = encryptPhone('13812345678');
    expect(Buffer.compare(enc1, enc2)).not.toBe(0);
  });

  it('should produce different ciphertexts for different phones', async () => {
    const { encryptPhone } = await import('../../utils/crypto.js');
    const enc1 = encryptPhone('13812345678');
    const enc2 = encryptPhone('13987654321');
    expect(Buffer.compare(enc1, enc2)).not.toBe(0);
  });

  it('should handle Uint8Array input for decryptPhone', async () => {
    const { encryptPhone, decryptPhone } = await import('../../utils/crypto.js');
    const phone = '13800001111';
    const encrypted = encryptPhone(phone);
    const uint8 = new Uint8Array(encrypted);
    const decrypted = decryptPhone(uint8);
    expect(decrypted).toBe(phone);
  });
});

describe('maskPhone', () => {
  it('should mask standard 11-digit number "13812345678"', async () => {
    const { maskPhone } = await import('../../utils/crypto.js');
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('should mask another 11-digit number', async () => {
    const { maskPhone } = await import('../../utils/crypto.js');
    expect(maskPhone('15987654321')).toBe('159****4321');
  });

  it('should return original for short number', async () => {
    const { maskPhone } = await import('../../utils/crypto.js');
    expect(maskPhone('12345')).toBe('12345');
  });

  it('should return empty for empty string', async () => {
    const { maskPhone } = await import('../../utils/crypto.js');
    expect(maskPhone('')).toBe('');
  });

  it('should return original for 4-digit number', async () => {
    const { maskPhone } = await import('../../utils/crypto.js');
    expect(maskPhone('1234')).toBe('1234');
  });

  it('should not mask 10-digit number', async () => {
    const { maskPhone } = await import('../../utils/crypto.js');
    expect(maskPhone('1381234567')).toBe('1381234567');
  });
});
