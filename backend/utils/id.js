import { randomBytes } from 'crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Sinh khóa chính ngẫu nhiên 10 ký tự (a-z0-9) thay cho AUTO_INCREMENT
export function newId(length = 10) {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}