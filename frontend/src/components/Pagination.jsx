/**
 * Pagination.jsx — Điều khiển phân trang (dùng cho 2 table DataSensor & ActionHistory)
 *
 * - buildPages: liệt kê trang với dấu ... cho khoảng lớn (luôn giữ trang 1 và cuối).
 * - Prev/Next disable ở biên; kèm form "Go to" nhảy thẳng tới trang.
 * - Ẩn hoàn toàn nếu total_pages ≤ 1.
 * Props: pagination {current_page,total_pages}, onPageChange.
 */
import { useState } from 'react';

function buildPages(current, total) {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, start + 3);
  start = Math.max(2, end - 3);

  pages.push(1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.total_pages <= 1) {
    return null;
  }

  const { current_page, total_pages } = pagination;
  const pages = buildPages(current_page, total_pages);
  const [jumpValue, setJumpValue] = useState('');

  function handleJump(event) {
    event.preventDefault();
    const num = Number(jumpValue);
    if (Number.isFinite(num) && num >= 1 && num <= total_pages) {
      onPageChange(num);
      setJumpValue('');
    }
  }

  return (
    <div className="pagination-wrap">
      <div className="pagination">
        <button
          type="button"
          className="page-btn"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
        >
          Prev
        </button>
        {pages.map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="page-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={`page-btn${page === current_page ? ' active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        )}
        <button
          type="button"
          className="page-btn"
          disabled={current_page >= total_pages}
          onClick={() => onPageChange(current_page + 1)}
        >
          Next
        </button>
      </div>
      <form className="page-jump" onSubmit={handleJump}>
        <span className="page-jump-label">Go to</span>
        <input
          type="text"
          className="page-jump-input"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          placeholder={`${current_page}/${total_pages}`}
        />
        <button type="submit" className="page-btn page-jump-btn">
          Go
        </button>
      </form>
    </div>
  );
}
