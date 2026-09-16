/**
 * utils/id.js — Sinh khóa chính chuỗi ngẫu nhiên 10 ký tự (a-z0-9)
 *
 * Dùng cho mọi bảng (users/sensors/devices/datasensors/action) thay cho AUTO_INCREMENT
 * theo quyết định schema: id VARCHAR(10) PRIMARY KEY.
 */
import { randomBytes } from 'crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function newId(length = 10) {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}