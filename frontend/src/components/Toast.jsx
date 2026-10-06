/**
 * Toast.jsx — Thông báo nổi tạm thời (success / error
 */
import { useEffect } from 'react';

export default function Toast({ message, type = 'error', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}