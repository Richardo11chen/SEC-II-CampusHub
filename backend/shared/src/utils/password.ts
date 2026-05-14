import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordFormat(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8 || password.length > 32) {
    return { valid: false, message: '密码长度需在 8-32 位之间' };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: '密码必须包含字母和数字' };
  }
  return { valid: true };
}
