/**
 * utils/timeRange.js — Parse chuỗi thời gian linh hoạt ra khoảng [start, end]
 *
 * Hỗ trợ định dạng: 2026 | 2026-09 | 2026-09-14 | "2026-09-14 10" |
 * "2026-09-14 10:30" | "2026-09-14 10:30:45" (phân cách 'T' hoặc space).
 * Dùng cho filter time của /api/data/getall và /api/device/history.
 * Trả về { unit, start, end } hoặc null nếu không khớp / sai giá trị.
 */

const PATTERNS = [
  { regex: /^(\d{4})$/, unit: 'year' },
  { regex: /^(\d{4})-(\d{2})$/, unit: 'month' },
  { regex: /^(\d{4})-(\d{2})-(\d{2})$/, unit: 'day' },
  { regex: /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2})$/, unit: 'hour' },
  { regex: /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})$/, unit: 'minute' },
  { regex: /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})$/, unit: 'second' },
];

// Chèn thêm số 0 vào trước chuỗi/số nếu độ dài nhỏ hơn 2 (ví dụ: 5 -> '05')
function pad(value) {
  return String(value).padStart(2, '0');
}

// Xây dựng khoảng thời gian [start, end] tương ứng dựa trên các thành phần thời gian và đơn vị lọc
function buildRange(parts, unit) {
  const [year, month, day, hour, minute, second] = parts;
  switch (unit) {
    case 'year':
      return { start: `${year}-01-01 00:00:00`, end: `${Number(year) + 1}-01-01 00:00:00` };
    case 'month': {
      const nextMonth = Number(month) === 12 ? `${Number(year) + 1}-01-01` : `${year}-${pad(Number(month) + 1)}-01`;
      return { start: `${year}-${month}-01 00:00:00`, end: `${nextMonth} 00:00:00` };
    }
    case 'day':
      return { start: `${year}-${month}-${day} 00:00:00`, end: addDays(`${year}-${month}-${day}`, 1) };
    case 'hour':
      return { start: `${year}-${month}-${day} ${hour}:00:00`, end: `${year}-${month}-${day} ${hour}:59:59` };
    case 'minute':
      return { start: `${year}-${month}-${day} ${hour}:${minute}:00`, end: `${year}-${month}-${day} ${hour}:${minute}:59` };
    case 'second':
      return { start: `${year}-${month}-${day} ${hour}:${minute}:${second}`, end: `${year}-${month}-${day} ${hour}:${minute}:${second}` };
    default:
      return null;
  }
}

// Cộng thêm một số ngày vào một ngày cụ thể
function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d} 00:00:00`;
}

// Phân tích cú pháp chuỗi thời gian đầu vào linh hoạt (năm, tháng, ngày, giờ, phút, giây) thành khoảng thời gian [start, end]
export function parseFlexibleTime(input) {
  if (input === undefined || input === null || String(input).trim() === '') {
    return null;
  }
  const raw = String(input).trim().replace('T', ' ');
  for (const pattern of PATTERNS) {
    const match = raw.match(pattern.regex);
    if (!match) continue;

    const year = match[1];
    const month = match[2];
    const day = match[3];
    const hour = match[4];
    const minute = match[5];
    const second = match[6];

    if (month && (Number(month) < 1 || Number(month) > 12)) return null;
    if (day && (Number(day) < 1 || Number(day) > 31)) return null;
    if (hour && Number(hour) > 23) return null;
    if (minute && Number(minute) > 59) return null;
    if (second && Number(second) > 59) return null;

    const range = buildRange([year, month, day, hour, minute, second], pattern.unit);
    if (!range) return null;
    return { unit: pattern.unit, ...range };
  }
  return null;
}
