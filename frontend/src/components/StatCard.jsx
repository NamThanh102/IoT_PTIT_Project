/**
 * StatCard.jsx — Thẻ số liệu cảm biến (nhiệt độ / độ ẩm / ánh sáng)
 *
 * Tính năng:
 * - Màu nền là gradient trộn từ `from`→`to` theo vị trí value trong [min, max].
 * - Nhãn mức: Yếu → Rất cao (LEVELS) dựa trên tỷ lệ value/max.
 * - Tự chọn màu chữ tương phản với nền (luminance).
 * - Thanh tiến trình minh hoạ tỷ lệ value/max; value không phải số → '--'.
 *
 * Props: icon, label, unit, value, from, to, min, max.
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function mixColors(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const LEVELS = ['Yếu', 'Hơi yếu', 'Trung bình', 'Khá cao', 'Rất cao'];

export default function StatCard({ icon, label, unit, value, from = '#d1d5db', to = '#6b7280', min = 0, max = 100 }) {
  const hasValue = typeof value === 'number';
  const t = clamp01(hasValue ? (value - min) / (max - min) : 0);
  const levelIndex = hasValue ? Math.min(LEVELS.length - 1, Math.floor(t * LEVELS.length)) : -1;
  const levelLabel = levelIndex < 0 ? '--' : LEVELS[levelIndex];

  const cardColor = mixColors(from, to, t);
  const textColor = luminance(cardColor) > 0.45 ? '#0b1c30' : '#ffffff';
  const mutedColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.78)' : 'var(--text-muted)';
  const fillColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.9)' : to;

  return (
    <div className="stat-card" style={{ background: cardColor }}>
      <div className="stat-card-top">
        <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.22)', color: textColor }}>
          {icon}
        </div>
        <span className="stat-label" style={{ color: mutedColor }}>{label}</span>
      </div>
      <div className="stat-value">
        <span style={{ color: textColor }}>{hasValue ? value : '--'}</span>
        <span className="stat-unit" style={{ color: mutedColor }}>{unit}</span>
      </div>
      <div className="stat-level" style={{ color: textColor }}>{levelLabel}</div>
      <div className="stat-bar">
        <div className="stat-bar-track">
          <div
            className="stat-bar-fill"
            style={{ width: `${t * 100}%`, background: fillColor }}
          />
        </div>
      </div>
    </div>
  );
}